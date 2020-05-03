import { CommandStore, KlasaMessage } from 'klasa';

import { BotCommand } from '../../lib/BotCommand';
import { stringMatches, formatDuration, rand } from '../../lib/util';
import { Time, Activity, Tasks } from '../../lib/constants';
import { PrayerActivityTaskOptions } from '../../lib/types/minions';
import addSubTaskToActivityTask from '../../lib/util/addSubTaskToActivityTask';
import Prayer from '../../lib/skilling/skills/prayer';
import { UserSettings } from '../../lib/settings/types/UserSettings';
import { SkillsEnum } from '../../lib/skilling/types';
import { roll } from 'oldschooljs/dist/util/util';

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

	async run(msg: KlasaMessage, [quantity, boneName = '']: [null | number | string, string]) {
		if (!msg.author.hasMinion) {
			throw `You dont have a minion`;
		}
		// default bury speed
		let speedmod = 1;

		if (msg.flagArgs.chaos) {
			speedmod = 4.8;
		}

		if (msg.author.minionIsBusy) {
			return msg.send(msg.author.minionStatus);
		}

		if (typeof quantity === 'string') {
			boneName = quantity;
			quantity = null;
		}

		const bone = Prayer.Bones.find(
			bone =>
				stringMatches(bone.name, boneName) ||
				stringMatches(bone.name.split(' ')[0], boneName)
		);

		if (!bone) {
			throw `That's not a valid bone to bury. Valid bones are ${Prayer.Bones.map(
				bone => bone.name
			).join(', ')}.`;
		}

		if (msg.author.skillLevel(SkillsEnum.Prayer) < bone.level) {
			throw `${msg.author.minionName} needs ${bone.level} Prayer to bury ${bone.name}.`;
		}

		// Time to bury a bone

		const timeToBuryABone = speedmod * (Time.Second * 1.2 + Time.Second / 4);

		// If no quantity provided, set it to the max.
		if (quantity === null) {
			const amountOfBonesOwned = msg.author.settings.get(UserSettings.Bank)[bone.inputBones];
			if (!amountOfBonesOwned || amountOfBonesOwned === 0) throw `You have no ${bone.name}.`;
			quantity = Math.min(
				Math.floor(msg.author.maxTripLength / timeToBuryABone),
				amountOfBonesOwned
			);
		}
		let bonesLost = 0;
		// See if at chaos altar
		let chaos = false;
		if (msg.flagArgs.chaos) {
			const trips = Math.ceil(quantity / 27);
			let deathCounter = 0;

			chaos = true;

			for (let i = 0; i < trips; i++) {
				if (roll(10)) {
					deathCounter++;
				}
			}
			for (let i = 0; i < deathCounter; i++) {
				bonesLost += rand(1, 27);
			}
		}

		// Check the user has the required bones to bury.
		const hasRequiredLogs = await msg.author.hasItem(bone.inputBones, quantity);
		if (!hasRequiredLogs) {
			throw `You dont have ${quantity}x ${bone.name}.`;
		}

		const duration = quantity * timeToBuryABone;

		if (duration > msg.author.maxTripLength) {
			throw `${msg.author.minionName} can't go on trips longer than ${formatDuration(
				msg.author.maxTripLength
			)}, try a lower quantity. The highest amount of ${
				bone.name
			}s you can light is ${Math.floor(msg.author.maxTripLength / timeToBuryABone)}.`;
		}

		const data: PrayerActivityTaskOptions = {
			boneID: bone.inputBones,
			userID: msg.author.id,
			channelID: msg.channel.id,
			quantity,
			duration,
			chaos,
			bonesLost,
			type: Activity.Prayer,
			id: rand(1, 10_000_000),
			finishDate: Date.now() + 30000
		};

		// Remove the bones from their bank.
		await msg.author.removeItemFromBank(bone.inputBones, quantity);

		await addSubTaskToActivityTask(this.client, Tasks.SkillingTicker, data);

		msg.author.incrementMinionDailyDuration(duration);
		return msg.send(
			`${msg.author.minionName} is now burying ${quantity}x ${
				bone.name
			}, it'll take around ${formatDuration(duration)} to finish.`
		);
	}
}
