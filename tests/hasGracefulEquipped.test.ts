import { constructGearSetup } from '../src/lib/gear';
import { hasGracefulEquipped } from '../src/lib/gear/functions/hasGracefulEquipped';

describe('hasGracefulEquipped', () => {
	test('has graceful equipped', () => {
		expect(
			hasGracefulEquipped(
				constructGearSetup({
					body: 'Graceful top',
					cape: 'Arceuus graceful cape',
					feet: 'Shayzien graceful boots',
					hands: 'Dark graceful gloves',
					head: 'Piscarilius graceful hood',
					legs: 'Trailblazer graceful legs'
				})
			)
		).toEqual(true);
	});

	test('no graceful equipped', () => {
		expect(hasGracefulEquipped(constructGearSetup({}))).toEqual(false);
	});

	test('agility cape instead of graceful cape', () => {
		const base = {
			body: 'Graceful top',
			feet: 'Shayzien graceful boots',
			hands: 'Dark graceful gloves',
			head: 'Piscarilius graceful hood',
			legs: 'Hosidius graceful legs'
		};
		expect(hasGracefulEquipped(constructGearSetup({ ...base, cape: 'Agility cape' }))).toEqual(true);
		expect(hasGracefulEquipped(constructGearSetup({ ...base, cape: 'Agility cape(t)' }))).toEqual(true);
		expect(hasGracefulEquipped(constructGearSetup({ ...base, cape: 'Max cape' }))).toEqual(true);
		expect(hasGracefulEquipped(constructGearSetup({ ...base }))).toEqual(false);
	});
});
