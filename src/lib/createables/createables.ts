import { Bank } from '../types';
import Barrows from './barrows';
import Misc from './misc';
import Crafting from './crafting';
import Prayer from './prayer';
import SkillingSets from './skillingSets';
import Smithing from './smithing';

interface Createable {
	name: string;
	outputItems: Bank;
	inputItems: Bank;
	smithingLevel?: number;
	addOutputToCollectionLog?: boolean;
	cantHaveItems: Bank;
	firemakingLevel?: number;
	craftingLevel?: number;
	prayerLevel?: number;
}

const Createables: Createable[] = [
	...Barrows,
	...Misc,
	...Crafting,
	...Prayer,
	...SkillingSets,
	...Smithing
];

export default Createables;
