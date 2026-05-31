import {
  render,
  screen,
  waitFor
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { GroupsPage } from './GroupsPage.jsx';

const initialGroupsPayload = {
  groups: [
    {
      id: 'group-1',
      name: 'Dorm Dinner',
      description: 'Shared pantry group.',
      inviteCode: 'DORMD-ABCD',
      role: 'Admin',
      members: 3
    }
  ]
};

const createdGroupPayload = {
  id: 'group-2',
  name: 'Apartment Dinner',
  description: 'New shared pantry group.',
  inviteCode: 'APART-WXYZ',
  role: 'Admin',
  members: 1
};

describe('GroupsPage', () => {
  let fetchMock;
  let storage;

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => storage.get(key) ?? null),
      setItem: vi.fn((key, value) => {
        storage.set(key, String(value));
      }),
      removeItem: vi.fn((key) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      })
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue() }
    });

    localStorage.setItem(
      'recipeCollab.session',
      JSON.stringify({
        profileId: '11111111-1111-4111-8111-111111111111',
        email: 'kartik@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: 4102444800
      })
    );

    fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input);

      if (url === '/api/groups' && options.method === 'POST') {
        return new Response(
          JSON.stringify(createdGroupPayload),
          {
            status: 201,
            headers: { 'content-type': 'application/json' }
          }
        );
      }

      if (url === '/api/groups') {
        return new Response(
          JSON.stringify(initialGroupsPayload),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      }

      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderGroupsPage() {
    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>
    );
  }

  it('shows inline group controls and confirms invite code copies', async () => {
    const user = userEvent.setup();

    renderGroupsPage();

    expect(
      await screen.findByText('Dorm Dinner')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /create group/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /join group/i })
    ).toBeInTheDocument();
    expect(screen.getByText('DORMD-ABCD')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /^code$/i })
    );

    expect(
      screen.getByRole('button', { name: /copied/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/groups loaded from/i)
    ).not.toBeInTheDocument();
  });

  it('creates a group and surfaces the generated invite code', async () => {
    const user = userEvent.setup();

    renderGroupsPage();

    await screen.findByText('Dorm Dinner');
    await user.type(
      screen.getByLabelText(/group name/i),
      'Apartment Dinner'
    );
    await user.type(
      screen.getByLabelText(/description/i),
      'New shared pantry group.'
    );
    await user.click(
      screen.getByRole('button', {
        name: /^create group$/i
      })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/groups',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const createCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === '/api/groups' &&
        options?.method === 'POST'
    );

    expect(JSON.parse(createCall[1].body)).toEqual({
      name: 'Apartment Dinner',
      description: 'New shared pantry group.'
    });
    expect(
      await screen.findAllByText('APART-WXYZ')
    ).toHaveLength(2);
    expect(
      screen.getByRole('heading', {
        name: /share "apartment dinner"/i
      })
    ).toBeInTheDocument();
  });

  it('joins by invite code', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url === '/api/groups/join') {
        return new Response(
          JSON.stringify({
            id: 'group-3',
            name: 'Project Dinner',
            description: 'Shared pantry group.',
            inviteCode: 'PROJE-1234',
            role: 'Member',
            members: 4
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify(initialGroupsPayload),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      );
    });

    renderGroupsPage();

    await screen.findByText('Dorm Dinner');
    await user.type(
      screen.getByLabelText(/invite code/i),
      'proje-1234'
    );
    await user.click(
      screen.getByRole('button', {
        name: /join group/i
      })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/groups/join',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const joinCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === '/api/groups/join'
    );

    expect(JSON.parse(joinCall[1].body)).toEqual({
      inviteCode: 'PROJE-1234'
    });
    expect(
      await screen.findByText('Project Dinner')
    ).toBeInTheDocument();
  });
});
