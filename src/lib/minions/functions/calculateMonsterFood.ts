import { KlasaUser } from 'klasa';
import { O } from 'ts-toolbelt';

import { maxDefenceStats, maxOffenceStats } from '../../gear';
import { inverseOfOffenceStat } from '../../gear/functions/inverseOfStat';
import { calcWhatPercent, reduceNumByPercent } from '../../util';
import { KillableMonster } from '../types';

const { floor, max } = Math;

export default function calculateMonsterFood(
	monster: O.Readonly<KillableMonster>,
	user: O.Readonly<KlasaUser>
): [number, string[]] {
	const messages: string[] = [];
	let { healAmountNeeded, attackStyleToUse, attackStylesUsed } = monster;

	if (!healAmountNeeded || !attackStyleToUse || !attackStylesUsed) {
		return [0, messages];
	}

	messages.push(`${monster.name} needs ${healAmountNeeded}HP worth of food per kill.`);

	const gearStats = user.getGear(attackStyleToUse).stats;

	let totalPercentOfGearLevel = 0;
	let totalOffensivePercent = 0;
	for (const style of attackStylesUsed) {
		const inverseStyle = inverseOfOffenceStat(style);
		const usersStyle = gearStats[inverseStyle];
		const maxStyle = maxDefenceStats[inverseStyle]!;
		const percent = floor(calcWhatPercent(usersStyle, maxStyle));
		messages.push(`Your ${inverseStyle} bonus is ${percent}% of the best (${usersStyle} out of ${maxStyle})`);
		totalPercentOfGearLevel += percent;

		totalOffensivePercent += floor(calcWhatPercent(gearStats[style], maxOffenceStats[style]));
	}

	totalPercentOfGearLevel = Math.min(floor(max(0, totalPercentOfGearLevel / attackStylesUsed.length)), 95);
	totalOffensivePercent = floor(max(0, totalOffensivePercent / attackStylesUsed.length));

	messages.push(`You use ${floor(totalPercentOfGearLevel)}% less food because of your defensive stats.`);
	healAmountNeeded = floor(reduceNumByPercent(healAmountNeeded, totalPercentOfGearLevel));
	messages.push(`You use ${floor(totalOffensivePercent)}% less food because of your offensive stats.`);
	healAmountNeeded = floor(reduceNumByPercent(healAmountNeeded, totalOffensivePercent));

	messages.push(
		`You use ${(100 - calcWhatPercent(healAmountNeeded, monster.healAmountNeeded!)).toFixed(
			2
		)}% less food (${healAmountNeeded}HP instead of ${
			monster.healAmountNeeded
		}HP) because of your ${attackStyleToUse} gear`
	);

	return [healAmountNeeded, messages];
}
