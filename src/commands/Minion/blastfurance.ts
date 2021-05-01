import { CommandStore, KlasaMessage } from 'klasa';

import { Activity, Time } from '../../lib/constants';
import { minionNotBusy, requiresMinion } from '../../lib/minions/decorators';
import { UserSettings } from '../../lib/settings/types/UserSettings';
import Smithing from '../../lib/skilling/skills/smithing';
import { SkillsEnum } from '../../lib/skilling/types';
import { BotCommand } from '../../lib/structures/BotCommand';
import { ItemBank } from '../../lib/types';
import { BlastfuranceActivityTaskOptions } from '../../lib/types/minions';
import {
	bankHasItem,
	formatDuration,
	itemID,
	itemNameFromID,
	removeItemFromBank,
	stringMatches
} from '../../lib/util';
import addSubTaskToActivityTask from '../../lib/util/addSubTaskToActivityTask';

export default class extends BotCommand {
	public constructor(store: CommandStore, file: string[], directory: string) {
		super(store, file, directory, {
			altProtection: true,
			oneAtTime: true,
			cooldown: 1,
			usage: '<quantity:int{1}|name:...string> [name:...string]',
			aliases: ['bf','blastfurnace'],
			usageDelim: ' ',
			categoryFlags: ['minion', 'skilling'],
			description: 'Sends your minion to smelt items, which is turning ores into bars.',
			examples: ['+Blastfurance bronze']
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

		let coalbag = '';
		if (
			bar.id === itemID('Steel Bar') ||
			bar.id === itemID('Mithril Bar') ||
			bar.id === itemID('Adamantite Bar') ||
			bar.id === itemID('Runite Bar') && msg.author.hasItemEquippedOrInBank(itemID('Coal bag'))
		) {
			coalbag = `\n\n**Boosts:** 60% speed boost for coal bag.`;
			timeToSmithSingleBar = (bar.timeToUse + Time.Second / 10) * 0.62;
		}

		const maxTripLength = msg.author.maxTripLength(Activity.Smithing);

		// If no quantity provided, set it to the max.
		if (quantity === null) {
			quantity = Math.floor(maxTripLength / timeToSmithSingleBar);
		}

		await msg.author.settings.sync(true);
		const userBank = msg.author.settings.get(UserSettings.Bank);

		// Check the user has the required ores to smith these bars.
		// Multiplying the ore required by the quantity of bars.
		const requiredOres: [string, number][] = Object.entries(bar.inputOres);
		for (const [oreID, qty] of requiredOres) {
			if (!bankHasItem(userBank, parseInt(oreID), qty * quantity)) {
				return msg.send(`You don't have enough ${itemNameFromID(parseInt(oreID))}.`);
			}
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

		// Remove the ores from their bank.
		let newBank: ItemBank = { ...userBank };
		for (const [oreID, qty] of requiredOres) {
			if (newBank[parseInt(oreID)] < qty) {
				this.client.wtf(
					new Error(`${msg.author.sanitizedName} had insufficient ores to be removed.`)
				);
				return;
			}
			newBank = removeItemFromBank(newBank, parseInt(oreID), qty * quantity);
		}

		await addSubTaskToActivityTask<BlastfuranceActivityTaskOptions>(this.client, {
			barID: bar.id,
			userID: msg.author.id,
			channelID: msg.channel.id,
			quantity,
			duration,
			type: Activity.Blastfurance
		});
		await msg.author.settings.update(UserSettings.Bank, newBank);

		let goldGauntletMessage = ``;
		if (
			bar.id === itemID('Gold bar') &&
			msg.author.hasItemEquippedAnywhere(itemID('Goldsmith gauntlets'))
		) {
			goldGauntletMessage = `\n\n**Boosts:** 56.2 xp per gold bar for Goldsmith gauntlets.`;
		}

		return msg.send(
			`${msg.author.minionName} is now smelting ${quantity}x ${
				bar.name
			}, it'll take around ${formatDuration(
				duration
			)} to finish.${goldGauntletMessage}${coalbag}`
		);
	}
}
