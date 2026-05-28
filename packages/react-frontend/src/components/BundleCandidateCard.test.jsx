import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BundleCandidateCard } from '@/components/BundleCandidateCard.jsx';

const candidate = {
  id: 'bundle-test',
  title: 'Garden Pasta Board',
  rationale: 'A pantry-driven pasta board.',
  isSelected: false,
  courses: [
    { type: 'main', title: 'Garlic Garden Pasta' },
    { type: 'side', title: 'Toasted Bread Board' }
  ],
  missingIngredients: [{ name: 'Basil leaves' }],
  assumedStaples: [{ ingredientId: 'salt', name: 'Salt' }],
  ingredientList: [
    {
      ingredientId: 'pasta',
      name: 'Pasta',
      quantity: 1,
      unit: 'boxes'
    }
  ],
  contributorMapping: {
    pasta: [
      {
        userId: 'user-1',
        userName: 'Avery',
        quantity: 1,
        unit: 'boxes'
      }
    ]
  },
  instructions: ['Boil the pasta.', 'Serve with bread.']
};

describe('BundleCandidateCard', () => {
  it('shows missing-item flag and expands to reveal bundle details', async () => {
    const user = userEvent.setup();

    render(
      <BundleCandidateCard
        candidate={candidate}
        isAdmin
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Missing items')).toBeInTheDocument();
    expect(screen.queryByText('Assumed staples')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show details/i }));

    expect(screen.getByText('Assumed staples')).toBeInTheDocument();
    expect(screen.getByText('Boil the pasta.')).toBeInTheDocument();
    expect(screen.getByText(/Avery \(1 boxes\)/)).toBeInTheDocument();
  });

  it('renders admin select control and override badges when provided', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <BundleCandidateCard
        candidate={candidate}
        isAdmin
        onSelect={onSelect}
        overrides={[
          {
            id: 'override-1',
            label: 'Cuisine',
            rationale: 'Admin chose Italian for this request.'
          }
        ]}
      />
    );

    expect(screen.getByText('Override: Cuisine')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /select as active bundle/i })
    );

    expect(onSelect).toHaveBeenCalledWith(candidate);
  });
});
