import { screen } from '@testing-library/react-native';

import RankScreen from '@/app/(tabs)/rank';

import { api, leaderboardPage, testUser } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest, asSignedIn } from '../helpers/session';

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

  it('does not pin you twice when you are already in the list', async () => {
    asSignedIn();
    const you = {
      rank: 2,
      userId: testUser.id,
      username: testUser.username,
      displayName: testUser.displayName,
      avatarUrl: testUser.avatarUrl,
      aura: testUser.aura,
      title: testUser.title,
    };
    api.fetchGlobalLeaderboard.mockResolvedValue({
      entries: [leaderboardPage.entries[0]!, you],
      viewer: you,
      total: 2,
    });

    await renderApp(<RankScreen />);

    expect(await screen.findByText(`@${testUser.username}`)).toBeOnTheScreen();
    expect(screen.getAllByText(`@${testUser.username}`)).toHaveLength(1);
  });

  it('pins you at the bottom when you are outside the top list', async () => {
    asSignedIn();
    api.fetchGlobalLeaderboard.mockResolvedValue(leaderboardPage);

    await renderApp(<RankScreen />);

    expect(await screen.findByText('@alice')).toBeOnTheScreen();
    expect(screen.getByText(`@${testUser.username}`)).toBeOnTheScreen();
    expect(screen.getByText('You')).toBeOnTheScreen();
  });
});
