import { Emoji } from '../../../constants';
import { SkillsEnum } from '../../types';
import BlastableBar from './blastables';
import Bars from './smeltables';
import SmithableItems from './smithables';

const Smithing = {
	aliases: ['smithing'],
	Bars,
	SmithableItems,
	BlastableBar,
	id: SkillsEnum.Smithing,
	emoji: Emoji.Smithing,
	name: 'Smithing'
};

export default Smithing;
