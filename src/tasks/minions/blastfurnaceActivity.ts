import { Task } from 'klasa';
import { Bank } from 'oldschooljs';

import Smithing from '../../lib/skilling/skills/smithing';
import { SkillsEnum } from '../../lib/skilling/types';
import { BlastfuranceActivityTaskOptions } from '../../lib/types/minions';
import { handleTripFinish } from '../../lib/util/handleTripFinish';
import itemID from '../../lib/util/itemID';

export default class extends Task {
	async run(data: BlastfuranceActivityTaskOptions) {
		let { blastablebarID, quantity, userID, channelID, duration } = data;
		const user = await this.client.users.fetch(userID);

		const bar = Smithing.BlastableBar.find(blastablebar => blastablebar.id === blastablebarID)!;

		let xpReceived = quantity * bar.xp;

		if (bar.id === itemID('Gold bar') && user.hasItemEquippedAnywhere('Goldsmith gauntlets')) {
			xpReceived = quantity * 56.2;
		}

		const xpRes = await user.addXP(SkillsEnum.Smithing, xpReceived, duration);

		let str = `${user}, ${user.minionName} finished smelting ${quantity}x ${bar.name}. ${xpRes}`;

		const loot = new Bank({
			[bar.id]: quantity
		});

		await user.addItemsToBank(loot, true);

		handleTripFinish(
			this.client,
			user,
			channelID,
			str,
			res => {
				user.log(`continued trip of ${quantity}x ${bar.name}[${bar.id}]`);
				return this.client.commands.get('smelt')!.run(res, [quantity, bar.name]);
			},
			undefined,
			data,
			loot.bank
		);
	}
}
