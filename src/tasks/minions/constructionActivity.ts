import { Task, KlasaMessage } from 'klasa';

import { saidYes, noOp } from '../../lib/util';
import { Time } from '../../lib/constants';
import { SkillsEnum } from '../../lib/types';
import { ConstructionActivityTaskOptions } from '../../lib/types/minions';
import getUsersPerkTier from '../../lib/util/getUsersPerkTier';
import Construction from '../../lib/skills/Construction';
import { channelIsSendable } from '../../lib/util/channelIsSendable';

export default class extends Task {
	async run({ buildableID, quantity, userID, channelID }: ConstructionActivityTaskOptions) {
		const user = await this.client.users.fetch(userID);
		const currentLevel = user.skillLevel(SkillsEnum.Construction);

		const Build = Construction.Buildables.find(Build => Build.inputPlanks === buildableID);

		if (!Build) return;

		const xpReceived = quantity * Build.xp;

		await user.addXP(SkillsEnum.Construction, xpReceived);
		const newLevel = user.skillLevel(SkillsEnum.Construction);

		let str = `${user}, ${user.minionName} finished building with ${quantity} ${
			Build.name
		}, you also received ${xpReceived.toLocaleString()} XP. ${
			user.minionName
		} asks if you'd like them to do another of the same trip.`;

		if (newLevel > currentLevel) {
			str += `\n\n${user.minionName}'s Construction level is now ${newLevel}!`;
		}

		const channel = this.client.channels.get(channelID);
		if (!channelIsSendable(channel)) return;

		this.client.queuePromise(() => {
			channel.send(str);
			channel
				.awaitMessages(mes => mes.author === user && saidYes(mes.content), {
					time: getUsersPerkTier(user) > 1 ? Time.Minute * 10 : Time.Minute * 2,
					max: 1
				})
				.then(messages => {
					const response = messages.first();

					if (response) {
						if (response.author.minionIsBusy) return;
						user.log(
							`continued trip of ${quantity}x ${Build.name}[${Build.inputPlanks}]`
						);
						this.client.commands
							.get('build')!
							.run(response as KlasaMessage, [quantity, Build.name]);
					}
				})
				.catch(noOp);
		});
	}
}
