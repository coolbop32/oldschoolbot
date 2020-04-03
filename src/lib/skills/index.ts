import { Collection } from 'discord.js';

import Mining from './mining';
import Smithing from './smithing';
import Woodcutting from './woodcutting';
import { SkillsEnum } from '../types';
import Construction from './construction';

export type Skill = typeof Mining | typeof Smithing | typeof Woodcutting | typeof Construction;

const Skills: Collection<string, Skill> = new Collection([
	[SkillsEnum.Mining, Mining as Skill],
	[SkillsEnum.Smithing, Smithing as Skill],
	[SkillsEnum.Woodcutting, Woodcutting as Skill],
	[SkillsEnum.Construction, Construction as Skill]
]);

export default Skills;
