import { CommandStore, KlasaMessage } from 'klasa';

import { BotCommand } from '../../lib/BotCommand';
import { stringMatches, formatDuration, rand } from '../../lib/util';
import { SkillsEnum } from '../../lib/types';
import { Time, Activity, Tasks } from '../../lib/constants';
import { ConstructionActivityTaskOptions } from '../../lib/types/minions';
import addSubTaskToActivityTask from '../../lib/util/addSubTaskToActivityTask';
import Construction from '../../lib/skills/Construction';

export default class extends BotCommand {
	public constructor(store: CommandStore, file: string[], directory: string) {
		super(store, file, directory, {
			altProtection: true,
			oneAtTime: true,
			cooldown: 1,
			usage: '<quantity:int{1}|name:...string> [name:...string]',
			usageDelim: ' '
		});
	}

	async run(msg: KlasaMessage, [quantity, buildName = '']: [null | number | string, string]) {
		if (!msg.author.hasMinion) {
			throw `You dont have a minion`;
		}

		if (msg.author.minionIsBusy) {
			return msg.send(msg.author.minionStatus);
		}

		const build = Construction.Buildables.find(
			build =>
				stringMatches(build.name, buildName) ||
				stringMatches(build.name.split(' ')[0], buildName)
		);

		if (!build) {
			throw `That's not a valid log to light. Valid logs are ${Construction.Buildables.map(
				build => build.name
			).join(', ')}.`;
		}

		if (msg.author.skillLevel(SkillsEnum.Construction) < build.level) {
			throw `${msg.author.minionName} needs ${build.level} Construction to light ${build.name}s.`;
		}

		if (typeof quantity === 'string') {
			buildName = quantity;
			quantity = null;
		}

		// All logs take 2.4s to light, add on quarter of a second to account for banking/etc.
		const timeToLightSingleLog = Time.Second * 2.4 + Time.Second / 4;

		// If no quantity provided, set it to the max.
		if (quantity === null) {
			quantity = Math.floor((Time.Minute * 30) / timeToLightSingleLog);
		}

		await msg.author.settings.sync(true);

		// Check the user has the required logs to light.
		const hasRequiredPlanks = await msg.author.hasItem(build.inputPlanks, quantity);
		if (!hasRequiredPlanks) {
			throw `You dont have ${quantity}x ${build.name}.`;
		}

		const duration = quantity * timeToLightSingleLog;

		if (duration > Time.Minute * 30) {
			throw `${
				msg.author.minionName
			} can't go on trips longer than 30 minutes, try a lower quantity. The highest amount of ${
				build.name
			}s you can light is ${Math.floor((Time.Minute * 30) / timeToLightSingleLog)}.`;
		}

		const data: ConstructionActivityTaskOptions = {
			buildableID: build.inputPlanks,
			userID: msg.author.id,
			channelID: msg.channel.id,
			quantity,
			duration,
			type: Activity.Construction,
			id: rand(1, 10_000_000),
			finishDate: Date.now() + duration
		};

		// Remove the logs from their bank.
		await msg.author.removeItemFromBank(build.inputPlanks, quantity);

		await addSubTaskToActivityTask(this.client, Tasks.SkillingTicker, data);

		msg.author.incrementMinionDailyDuration(duration);
		return msg.send(
			`${msg.author.minionName} is now building ${quantity}x ${
				build.name
			}, it'll take around ${formatDuration(duration)} to finish.`
		);
	}
}
