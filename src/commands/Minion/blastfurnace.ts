import { CommandStore, KlasaMessage } from 'klasa';

import { Activity, Time } from '../../lib/constants';
import { hasGracefulEquipped } from '../../lib/gear/functions/hasGracefulEquipped';
import { minionNotBusy, requiresMinion } from '../../lib/minions/decorators';
import { UserSettings } from '../../lib/settings/types/UserSettings';
import Smithing from '../../lib/skilling/skills/smithing';
import { SkillsEnum } from '../../lib/skilling/types';
import { BotCommand } from '../../lib/structures/BotCommand';
import { BlastFurnaceActivityTaskOptions } from '../../lib/types/minions';
import {
	formatDuration,
	formatSkillRequirements,
	itemID,
	skillsMeetRequirements,
	stringMatches
} from '../../lib/util';
import addSubTaskToActivityTask from '../../lib/util/addSubTaskToActivityTask';

const requiredSkills = {
	cooking: 70,
	farming: 70,
	fishing: 70,
	mining: 70,
	woodcutting: 70,
	agility: 70,
	smithing: 70,
	herblore: 70,
	construction: 70,
	hunter: 70
};

export default class extends BotCommand {
	public constructor(store: CommandStore, file: string[], directory: string) {
		super(store, file, directory, {
			altProtection: true,
			oneAtTime: true,
			cooldown: 1,
			usage: '<quantity:int{1}|name:...string> [name:...string]',
			aliases: ['bf', 'blastfurnace'],
			usageDelim: ' ',
			categoryFlags: ['minion', 'skilling'],
			description: 'Sends your minion to the blast furnace to smelt bars.',
			examples: ['+blastfurnace bronze']
		});
	}

	@requiresMinion
	@minionNotBusy
	async run(msg: KlasaMessage, [quantity, barName = '']: [null | number | string, string]) {
		if (typeof quantity === 'string') {
			barName = quantity;
			quantity = null;
		}

		const bar = Smithing.BlastableBars.find(
			bar =>
				stringMatches(bar.name, barName) || stringMatches(bar.name.split(' ')[0], barName)
		);

		if (!skillsMeetRequirements(msg.author.rawSkills, requiredSkills)) {
			return msg.send(
				`You don't have the required stats to use the Blast Furance, you need: ${formatSkillRequirements(
					requiredSkills
				)}.`
			);
		}

		if (!bar) {
			return msg.send(
				`Thats not a valid bar to smelt. Valid bars are ${Smithing.BlastableBars.map(
					bar => bar.name
				).join(', ')}.`
			);
		}

		if (msg.author.skillLevel(SkillsEnum.Smithing) < bar.level) {
			return msg.send(
				`${msg.author.minionName} needs ${bar.level} Smithing to smelt ${bar.name}s.`
			);
		}

		let timeToSmithSingleBar = bar.timeToUse + Time.Second / 10;

		// check if they have a coal bag
		let coalbag = '';
		if (
			msg.author.hasItemEquippedOrInBank(itemID('Coal bag')) &&
			(bar.id === itemID('Steel Bar') ||
				bar.id === itemID('Mithril Bar') ||
				bar.id === itemID('Adamantite Bar') ||
				bar.id === itemID('Runite Bar'))
		) {
			coalbag = `\n\n**Boosts:** 60% speed boost for coal bag.`;
			timeToSmithSingleBar *= 0.625;
		}
		let graceful = '';
		if (!hasGracefulEquipped(msg.author.getGear('skilling'))) {
			timeToSmithSingleBar *= 1.075;
			graceful = `\n-7.5% time penalty for not having graceful equipped.`;
		}

		const maxTripLength = msg.author.maxTripLength(Activity.Smithing);

		await msg.author.settings.sync(true);
		const userBank = msg.author.bank();

		// If no quantity provided, set it to the max.
		if (quantity === null) {
			quantity = Math.floor(maxTripLength / timeToSmithSingleBar);
			const max = userBank.fits(bar.inputOres);
			if (max < quantity && max !== 0) quantity = max;
		}

		const duration = quantity * timeToSmithSingleBar;
		if (duration > maxTripLength) {
			return msg.send(
				`${msg.author.minionName} can't go on trips longer than ${formatDuration(
					maxTripLength
				)}, try a lower quantity. The highest amount of ${
					bar.name
				}s you can smelt is ${Math.floor(maxTripLength / timeToSmithSingleBar)}.`
			);
		}
		// Check the user has the required ores to smith these bars.

		const itemsNeeded = bar.inputOres.clone().multiply(quantity);
		if (!userBank.has(itemsNeeded.bank)) {
			return msg.send(
				`You don't have enough items. For ${quantity}x ${
					bar.name
				}, you're missing **${itemsNeeded.clone().remove(userBank)}**.`
			);
		}

		// cost to pay the foreman to use blast furance
		const coinsToRemove = Math.floor(72000 * (duration / Time.Hour));
		const gp = msg.author.settings.get(UserSettings.GP);
		if (gp < coinsToRemove) {
			return msg.send(`You need atleast ${coinsToRemove} GP to work at the Blast Furnace.`);
		}

		itemsNeeded.add('Coins', coinsToRemove);

		await msg.author.removeItemsFromBank(itemsNeeded);

		await addSubTaskToActivityTask<BlastFurnaceActivityTaskOptions>(this.client, {
			barID: bar.id,
			userID: msg.author.id,
			channelID: msg.channel.id,
			quantity,
			duration,
			type: Activity.BlastFurnace
		});

		let goldGauntletMessage = ``;
		if (
			bar.id === itemID('Gold bar') &&
			msg.author.hasItemEquippedOrInBank(itemID('Goldsmith gauntlets'))
		) {
			goldGauntletMessage = `\n\n**Boosts:** 56.2 xp per gold bar for Goldsmith gauntlets.`;
		}

		return msg.send(
			`${msg.author.minionName} is now smelting  ${quantity}x ${
				bar.name
			} at the Blast Furnace, it'll take around ${formatDuration(
				duration
			)} to finish. You paid ${coinsToRemove} GP to use the Blast Furnace.${goldGauntletMessage}${coalbag}${graceful}`
		);
	}
}
