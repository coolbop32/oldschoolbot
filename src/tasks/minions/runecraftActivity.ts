import { Task } from 'klasa';

import { roll, multiplyBank } from '../../lib/util';
import { Time, Events, Emoji } from '../../lib/constants';
import createReadableItemListFromBank from '../../lib/util/createReadableItemListFromTuple';
import Runecraft, { RunecraftActivityTaskOptions } from '../../lib/skilling/skills/runecraft';
import { calcMaxRCQuantity } from '../../lib/skilling/functions/calcMaxRCQuantity';
import { SkillsEnum } from '../../lib/skilling/types';
import itemID from '../../lib/util/itemID';
import { getRandomMysteryBox } from '../../lib/openables';
import { handleTripFinish } from '../../lib/util/handleTripFinish';

export default class extends Task {
	async run({
		runeID,
		essenceQuantity,
		userID,
		channelID,
		duration
	}: RunecraftActivityTaskOptions) {
		const user = await this.client.users.fetch(userID);
		user.incrementMinionDailyDuration(duration);
		const currentLevel = user.skillLevel(SkillsEnum.Runecraft);

		const rune = Runecraft.Runes.find(_rune => _rune.id === runeID);

		if (!rune) return;
		const quantityPerEssence = calcMaxRCQuantity(rune, user);
		const runeQuantity = essenceQuantity * quantityPerEssence;

		const xpReceived = essenceQuantity * rune.xp;

		await user.addXP(SkillsEnum.Runecraft, xpReceived);
		const newLevel = user.skillLevel(SkillsEnum.Runecraft);

		let str = `${user}, ${user.minionName} finished crafting ${runeQuantity} ${
			rune.name
		}, you also received ${xpReceived.toLocaleString()} XP.`;

		if (newLevel > currentLevel) {
			str += `\n\n${user.minionName}'s Runecraft level is now ${newLevel}!`;
		}

		let loot = {
			[rune.id]: runeQuantity
		};

		if (roll(10)) {
			if (duration > Time.Minute * 10) {
				loot = multiplyBank(loot, 2);
				loot[getRandomMysteryBox()] = 1;
			}
		}

		if (roll((1_795_758 - user.skillLevel(SkillsEnum.Runecraft) * 25) / essenceQuantity)) {
			loot[itemID('Rift guardian')] = 1;
			str += `\nYou have a funny feeling you're being followed...`;
			this.client.emit(
				Events.ServerNotification,
				`${Emoji.Runecraft} **${user.username}'s** minion, ${user.minionName}, just received a Rift guardian while crafting ${rune.name}s at level ${currentLevel} Runecrafting!`
			);
		}

		str += `\n\nYou received: ${await createReadableItemListFromBank(this.client, loot)}.`;

		await user.addItemsToBank(loot, true);

		handleTripFinish(this.client, user, channelID, str, res => {
			user.log(`continued trip of ${runeQuantity}x ${rune.name}[${rune.id}]`);
			return this.client.commands.get('rc')!.run(res, [essenceQuantity, rune.name]);
		});
	}
}
