import { SkillsEnum, Buildable } from '../types';
import itemID from '../util/itemID';
import { Emoji } from '../constants';

const buildables: Buildable[] = [
	{
		name: 'Plank',
		level: 1,
		xp: 29,
		inputPlanks: itemID('Plank')
	},
	{
		name: 'Oak plank',
		level: 15,
		xp: 60,
		inputPlanks: itemID('Oak plank')
	},
	{
		name: 'Teak plank',
		level: 35,
		xp: 90,
		inputPlanks: itemID('Teak plank')
	},
	{
		name: 'Mahogany plank',
		level: 40,
		xp: 140,
		inputPlanks: itemID('Mahogany plank')
	}
];

const Construction = {
	Buildables: buildables,
	id: SkillsEnum.Construction,
	emoji: Emoji.Construction
};

export default Construction;
