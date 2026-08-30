import { screen } from '@testing-library/react-native';

import RankScreen from '@/app/(tabs)/rank';

import { renderApp } from '../helpers/render';
import { asGuest } from '../helpers/session';

describe('Anyone opens the leaderboard', () => {
  beforeEach(() => {
    asGuest();
  });

  it('shows who is climbing', async () => {
    await renderApp(<RankScreen />);

    expect(await screen.findByLabelText('1st place')).toBeOnTheScreen();
    expect(screen.getByText('@alice')).toBeOnTheScreen();
    expect(screen.getByLabelText('82,421 Aura')).toBeOnTheScreen();
  });
});
