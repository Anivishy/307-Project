import {
  AlertTriangle,
  Check,
  ImagePlus,
  Info,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IngredientTypeahead } from '@/components/IngredientTypeahead.jsx';
import { PageHeader } from '@/components/PageHeader.jsx';
import { StatusMessage } from '@/components/StatusMessage.jsx';
import { TagInput } from '@/components/TagInput.jsx';
import {
  changeAccountPassword,
  completeEmailChange,
  deleteAccount,
  fetchCurrentProfile,
  requestEmailChange,
  updateProfileIdentity
} from '@/lib/accountApi.js';
import {
  fetchConstraintIngredientsByIds,
  fetchConstraints,
  fetchSpoonacularDefinitions,
  saveConstraints
} from '@/lib/constraintsApi.js';
import { getGroups } from '@/lib/groupApi.js';
import { getSavedSession } from '@/lib/session.js';

const EMPTY_DEFINITIONS = {
  diets: [],
  intolerances: [],
  cuisines: []
};

const SPICE_LEVELS = [
  { value: null, label: 'No preference' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' }
];

function toggleValue(values, value) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function DefinitionChecklist({ label, options, values, onChange }) {
  return (
    <fieldset className="definition-picker">
      <legend>{label}</legend>
      <div className="definition-grid">
        {options.map((option) => (
          <label className="definition-option" key={option.value}>
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={() =>
                onChange(toggleValue(values, option.value))
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_PICTURE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

function profileFromSession(session) {
  if (!session) {
    return null;
  }

  return {
    id: session.profileId,
    email: session.email,
    displayName: session.displayName ?? '',
    profilePictureUrl: session.profilePictureUrl ?? '',
    profilePictureStorageRef:
      session.profilePictureStorageRef ?? ''
  };
}

function formatAccountError(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function safeFileName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'profile-picture';
}

function storageRefForPicture(file, profileId) {
  return [
    'profile-pictures',
    profileId ?? 'me',
    `${Date.now()}-${safeFileName(file.name)}`
  ].join('/');
}

function inferPictureContentType(url) {
  const pathname = new URL(url).pathname.toLowerCase();

  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (pathname.endsWith('.png')) {
    return 'image/png';
  }

  if (pathname.endsWith('.webp')) {
    return 'image/webp';
  }

  if (pathname.endsWith('.gif')) {
    return 'image/gif';
  }

  throw new Error(
    'Profile picture URL must end in jpg, png, webp, or gif.'
  );
}

function validatePictureFile(file) {
  if (!PROFILE_PICTURE_CONTENT_TYPES.has(file.type)) {
    throw new Error(
      'Profile picture must be JPEG, PNG, WebP, or GIF.'
    );
  }

  if (
    file.size < 1 ||
    file.size > PROFILE_PICTURE_MAX_SIZE_BYTES
  ) {
    throw new Error(
      'Profile picture must be 5 MB or smaller.'
    );
  }
}

function buildStatus(tone, message) {
  return { tone, message };
}

export function ProfilePage() {
  const [sessionState, setSessionState] = useState(() =>
    getSavedSession()
  );
  const [profile, setProfile] = useState(() =>
    profileFromSession(sessionState)
  );
  const [identityForm, setIdentityForm] = useState(() => ({
    displayName: sessionState?.displayName ?? '',
    profilePictureUrl: sessionState?.profilePictureUrl ?? ''
  }));
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState(
    sessionState?.profilePictureUrl ?? ''
  );
  const [
    isPictureRemovalQueued,
    setIsPictureRemovalQueued
  ] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(
    Boolean(sessionState?.profileId)
  );
  const [isSavingIdentity, setIsSavingIdentity] =
    useState(false);
  const [identityStatus, setIdentityStatus] = useState(
    buildStatus('', '')
  );
  const [emailForm, setEmailForm] = useState({
    newEmail: ''
  });
  const [emailStatus, setEmailStatus] = useState(
    buildStatus('', '')
  );
  const [emailAction, setEmailAction] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: ''
  });
  const [passwordStatus, setPasswordStatus] = useState(
    buildStatus('', '')
  );
  const [isChangingPassword, setIsChangingPassword] =
    useState(false);
  const [deleteForm, setDeleteForm] = useState({
    currentPassword: '',
    confirmation: ''
  });
  const [deleteStatus, setDeleteStatus] = useState(
    buildStatus('', '')
  );
  const [isDeletingAccount, setIsDeletingAccount] =
    useState(false);

  const displayName =
    profile?.displayName ||
    sessionState?.displayName ||
    profile?.email ||
    sessionState?.email ||
    'Profile';
  const accountEmail =
    profile?.email ?? sessionState?.email ?? '';
  const avatarInitial = (
    displayName?.[0] ??
    accountEmail?.[0] ??
    '?'
  ).toUpperCase();
  const profilePictureSrc = isPictureRemovalQueued
    ? ''
    : picturePreviewUrl ||
      profile?.profilePictureUrl ||
      sessionState?.profilePictureUrl ||
      '';

  const [groupCount, setGroupCount] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [medicalRestrictions, setMedicalRestrictions] =
    useState([]);
  const [neverIncludeIngredients, setNeverIncludeIngredients] =
    useState([]);
  const [diets, setDiets] = useState([]);
  const [intolerances, setIntolerances] = useState([]);
  const [preferredCuisines, setPreferredCuisines] = useState([]);
  const [excludedCuisines, setExcludedCuisines] = useState([]);
  const [dislikedIngredients, setDislikedIngredients] = useState([]);
  const [spiceLevel, setSpiceLevel] = useState(null);
  const [definitions, setDefinitions] = useState(EMPTY_DEFINITIONS);
  const [isLoadingConstraints, setIsLoadingConstraints] =
    useState(true);
  const [isSavingConstraints, setIsSavingConstraints] =
    useState(false);
  const [constraintMessage, setConstraintMessage] =
    useState('');
  const [constraintError, setConstraintError] = useState('');

  const totalConstraintCount =
    allergies.length +
    medicalRestrictions.length +
    neverIncludeIngredients.length +
    diets.length +
    intolerances.length;

  const totalPreferenceCount =
    preferredCuisines.length +
    excludedCuisines.length +
    dislikedIngredients.length +
    (spiceLevel ? 1 : 0);

  const constraintStats = useMemo(
    () => [
      `${diets.length} diets`,
      `${intolerances.length} intolerances`,
      `${allergies.length} allergies`,
      `${medicalRestrictions.length} medical rules`,
      `${neverIncludeIngredients.length} blocked ingredients`
    ],
    [
      diets.length,
      intolerances.length,
      allergies.length,
      medicalRestrictions.length,
      neverIncludeIngredients.length
    ]
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadProfile() {
      if (!sessionState?.profileId) {
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);
      setIdentityStatus(buildStatus('', ''));

      try {
        const loadedProfile = await fetchCurrentProfile();

        if (isCancelled) {
          return;
        }

        setProfile(loadedProfile);
        setSessionState(getSavedSession());
        setIdentityForm({
          displayName: loadedProfile.displayName ?? '',
          profilePictureUrl:
            loadedProfile.profilePictureUrl ?? ''
        });
        setPicturePreviewUrl(
          loadedProfile.profilePictureUrl ?? ''
        );
        setPictureFile(null);
        setIsPictureRemovalQueued(false);
      } catch (error) {
        if (!isCancelled) {
          setIdentityStatus(
            buildStatus(
              'error',
              formatAccountError(
                error,
                'Unable to load account details.'
              )
            )
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [sessionState?.profileId]);

  useEffect(() => {
    return () => {
      if (
        picturePreviewUrl?.startsWith('blob:') &&
        typeof URL.revokeObjectURL === 'function'
      ) {
        URL.revokeObjectURL(picturePreviewUrl);
      }
    };
  }, [picturePreviewUrl]);

  useEffect(() => {
    let isCancelled = false;

    async function loadConstraints() {
      setIsLoadingConstraints(true);
      setConstraintError('');

      try {
        const [constraints, definitionPayload] = await Promise.all([
          fetchConstraints(),
          fetchSpoonacularDefinitions()
        ]);
        const ingredients =
          await fetchConstraintIngredientsByIds(
            constraints.neverIncludeIngredientIds ?? []
          );

        if (isCancelled) {
          return;
        }

        setDefinitions(definitionPayload ?? EMPTY_DEFINITIONS);
        setAllergies(constraints.allergies ?? []);
        setMedicalRestrictions(constraints.medicalRestrictions ?? []);
        setNeverIncludeIngredients(ingredients);
        setDiets(constraints.diets ?? []);
        setIntolerances(constraints.intolerances ?? []);
        setPreferredCuisines(constraints.preferredCuisines ?? []);
        setExcludedCuisines(constraints.excludedCuisines ?? []);
        setDislikedIngredients(constraints.dislikedIngredients ?? []);
        setSpiceLevel(constraints.spiceLevel ?? null);
      } catch (error) {
        if (!isCancelled) {
          setConstraintError(
            error instanceof Error
              ? error.message
              : 'Unable to load dietary rules.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingConstraints(false);
        }
      }
    }

    async function loadGroupCount() {
      if (!getSavedSession()?.profileId) {
        return;
      }
      try {
        const payload = await getGroups();
        if (!isCancelled) {
          setGroupCount(payload.groups.length);
        }
      } catch {
        // non-critical, leave count as null
      }
    }

    void loadConstraints();
    void loadGroupCount();

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleIdentityFieldChange(event) {
    const { name, value } = event.target;

    setIdentityForm((current) => ({
      ...current,
      [name]: value
    }));

    if (name === 'profilePictureUrl') {
      setPictureFile(null);
      setIsPictureRemovalQueued(false);
      setPicturePreviewUrl(value.trim());
    }
  }

  function handlePictureUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      validatePictureFile(file);
      const nextPreviewUrl =
        typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file)
          : '';

      setPictureFile(file);
      setPicturePreviewUrl(nextPreviewUrl);
      setIdentityForm((current) => ({
        ...current,
        profilePictureUrl: ''
      }));
      setIsPictureRemovalQueued(false);
      setIdentityStatus(
        buildStatus('success', 'Profile picture preview ready.')
      );
    } catch (error) {
      setIdentityStatus(
        buildStatus(
          'error',
          formatAccountError(
            error,
            'Unable to use that profile picture.'
          )
        )
      );
    } finally {
      event.target.value = '';
    }
  }

  function handleRemovePicture() {
    setPictureFile(null);
    setPicturePreviewUrl('');
    setIdentityForm((current) => ({
      ...current,
      profilePictureUrl: ''
    }));
    setIsPictureRemovalQueued(true);
    setIdentityStatus(
      buildStatus(
        'success',
        'Profile picture will be removed when saved.'
      )
    );
  }

  async function handleSaveIdentity(event) {
    event.preventDefault();
    setIsSavingIdentity(true);
    setIdentityStatus(buildStatus('', ''));

    try {
      const updates = {};
      const nextDisplayName = identityForm.displayName.trim();
      const currentDisplayName = profile?.displayName ?? '';
      const nextPictureUrl =
        identityForm.profilePictureUrl.trim();
      const currentPictureUrl = profile?.profilePictureUrl ?? '';

      if (nextDisplayName !== currentDisplayName) {
        updates.displayName = nextDisplayName || null;
      }

      if (isPictureRemovalQueued) {
        updates.profilePicture = null;
      } else if (pictureFile) {
        updates.profilePicture = {
          storageRef: storageRefForPicture(
            pictureFile,
            profile?.id ?? sessionState?.profileId
          ),
          contentType: pictureFile.type,
          sizeBytes: pictureFile.size
        };
      } else if (nextPictureUrl !== currentPictureUrl) {
        updates.profilePicture = nextPictureUrl
          ? {
              url: nextPictureUrl,
              contentType:
                inferPictureContentType(nextPictureUrl),
              sizeBytes: 1
            }
          : null;
      }

      if (Object.keys(updates).length === 0) {
        setIdentityStatus(
          buildStatus('success', 'No profile changes to save.')
        );
        return;
      }

      const updatedProfile =
        await updateProfileIdentity(updates);
      const updatedSession = getSavedSession();

      setProfile(updatedProfile);
      setSessionState(updatedSession);
      setIdentityForm({
        displayName: updatedProfile.displayName ?? '',
        profilePictureUrl:
          updatedProfile.profilePictureUrl ?? ''
      });
      setPicturePreviewUrl(
        pictureFile
          ? picturePreviewUrl
          : updatedProfile.profilePictureUrl ?? ''
      );
      setIsPictureRemovalQueued(false);
      setIdentityStatus(
        buildStatus('success', 'Account details saved.')
      );
    } catch (error) {
      setIdentityStatus(
        buildStatus(
          'error',
          formatAccountError(
            error,
            'Unable to save account details.'
          )
        )
      );
    } finally {
      setIsSavingIdentity(false);
    }
  }

  async function handleRequestEmailChange(event) {
    event.preventDefault();
    setEmailAction('request');
    setEmailStatus(buildStatus('', ''));

    try {
      const payload = await requestEmailChange(
        emailForm.newEmail.trim()
      );

      setSessionState(getSavedSession());
      setEmailStatus(
        buildStatus(
          'success',
          payload.status === 'verificationRequired'
            ? 'Verification email sent.'
            : 'Email changed. Sign in again.'
        )
      );
    } catch (error) {
      setEmailStatus(
        buildStatus(
          'error',
          formatAccountError(
            error,
            'Unable to request email change.'
          )
        )
      );
    } finally {
      setEmailAction('');
    }
  }

  async function handleCompleteEmailChange() {
    setEmailAction('complete');
    setEmailStatus(buildStatus('', ''));

    try {
      await completeEmailChange(emailForm.newEmail.trim());
      setSessionState(getSavedSession());
      setEmailStatus(
        buildStatus('success', 'Email changed. Sign in again.')
      );
    } catch (error) {
      setEmailStatus(
        buildStatus(
          'error',
          formatAccountError(
            error,
            'Unable to complete email change.'
          )
        )
      );
    } finally {
      setEmailAction('');
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setIsChangingPassword(true);
    setPasswordStatus(buildStatus('', ''));

    try {
      await changeAccountPassword(passwordForm);
      setPasswordForm({
        currentPassword: '',
        newPassword: ''
      });
      setSessionState(getSavedSession());
      setPasswordStatus(
        buildStatus(
          'success',
          'Password changed. Sign in again.'
        )
      );
    } catch (error) {
      setPasswordStatus(
        buildStatus(
          'error',
          formatAccountError(
            error,
            'Unable to change password.'
          )
        )
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleDeleteAccount(event) {
    event.preventDefault();
    setIsDeletingAccount(true);
    setDeleteStatus(buildStatus('', ''));

    try {
      await deleteAccount(deleteForm);
      setDeleteForm({
        currentPassword: '',
        confirmation: ''
      });
      setProfile(null);
      setSessionState(getSavedSession());
      setDeleteStatus(
        buildStatus(
          'success',
          'Account deleted. Sign in again to continue.'
        )
      );
    } catch (error) {
      setDeleteStatus(
        buildStatus(
          'error',
          formatAccountError(
            error,
            'Unable to delete account.'
          )
        )
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }

  async function handleSaveConstraints() {
    setIsSavingConstraints(true);
    setConstraintMessage('');
    setConstraintError('');

    try {
      const constraints = await saveConstraints({
        allergies,
        medicalRestrictions,
        diets,
        intolerances,
        neverIncludeIngredientIds: neverIncludeIngredients.map(
          (ingredient) => ingredient.id
        ),
        preferredCuisines,
        excludedCuisines,
        dislikedIngredients,
        spiceLevel
      });
      const ingredients = await fetchConstraintIngredientsByIds(
        constraints.neverIncludeIngredientIds ?? []
      );

      setAllergies(constraints.allergies ?? []);
      setMedicalRestrictions(constraints.medicalRestrictions ?? []);
      setNeverIncludeIngredients(ingredients);
      setDiets(constraints.diets ?? []);
      setIntolerances(constraints.intolerances ?? []);
      setPreferredCuisines(constraints.preferredCuisines ?? []);
      setExcludedCuisines(constraints.excludedCuisines ?? []);
      setDislikedIngredients(constraints.dislikedIngredients ?? []);
      setSpiceLevel(constraints.spiceLevel ?? null);
      setConstraintMessage('Profile rules saved.');
    } catch (error) {
      setConstraintError(
        error instanceof Error
          ? error.message
          : 'Unable to save dietary rules.'
      );
    } finally {
      setIsSavingConstraints(false);
    }
  }

  return (
    <section className="screen profile-screen">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Manage account details and hard dietary rules before group meals are generated."
      />

      <section className="profile-card surface-card">
        <div
          className={`profile-avatar ${
            profilePictureSrc ? 'profile-avatar--image' : ''
          }`}>
          {profilePictureSrc ? (
            <img src={profilePictureSrc} alt="" />
          ) : (
            avatarInitial
          )}
        </div>
        <div>
          <h2>{displayName}</h2>
          <p>{accountEmail}</p>
          <div className="profile-pills">
            <span>
              {groupCount !== null
                ? `${groupCount} group${groupCount !== 1 ? 's' : ''}`
                : '-'}
            </span>
            <span>
              {totalConstraintCount} hard rule
              {totalConstraintCount !== 1 ? 's' : ''}
            </span>
            <span>
              {totalPreferenceCount} preference{totalPreferenceCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </section>

      <section
        className="account-grid"
        aria-label="Account settings">
        <form
          className="account-panel surface-card"
          aria-busy={isLoadingProfile || isSavingIdentity}
          onSubmit={handleSaveIdentity}>
          <div className="account-panel__header">
            <UserRound size={20} />
            <div>
              <p className="eyebrow">Identity</p>
              <h2>Account Details</h2>
            </div>
          </div>

          <div className="account-form-grid">
            <label className="field">
              <span>Display name</span>
              <input
                name="displayName"
                value={identityForm.displayName}
                onChange={handleIdentityFieldChange}
                disabled={isLoadingProfile || isSavingIdentity}
              />
            </label>
            <label className="field">
              <span>Profile picture URL</span>
              <input
                name="profilePictureUrl"
                type="url"
                value={identityForm.profilePictureUrl}
                onChange={handleIdentityFieldChange}
                disabled={isLoadingProfile || isSavingIdentity}
              />
            </label>
          </div>

          <div className="picture-editor">
            <div className="picture-preview" aria-label="Profile picture preview">
              {profilePictureSrc ? (
                <img src={profilePictureSrc} alt="" />
              ) : (
                <ImagePlus size={24} />
              )}
            </div>
            <div className="picture-actions">
              <label
                className="button button--dark account-upload-button"
                htmlFor="profile-picture-upload">
                <Upload size={17} /> Upload
              </label>
              <input
                id="profile-picture-upload"
                className="account-file-input"
                type="file"
                aria-label="Upload profile picture"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePictureUpload}
                disabled={isLoadingProfile || isSavingIdentity}
              />
              <button
                className="button button--dark"
                type="button"
                onClick={handleRemovePicture}
                disabled={isLoadingProfile || isSavingIdentity}>
                <Trash2 size={17} /> Remove
              </button>
            </div>
          </div>

          {identityStatus.message && (
            <p
              className={`account-status account-status--${identityStatus.tone}`}
              role={identityStatus.tone === 'error' ? 'alert' : 'status'}>
              {identityStatus.message}
            </p>
          )}

          <button
            className="button"
            type="submit"
            disabled={isLoadingProfile || isSavingIdentity}>
            {isSavingIdentity ? (
              <>
                <Loader2 size={18} className="auth-spinner" />
                Saving
              </>
            ) : (
              <>
                <Save size={18} />
                Save Profile
              </>
            )}
          </button>
        </form>

        <form
          className="account-panel surface-card"
          onSubmit={handleRequestEmailChange}>
          <div className="account-panel__header">
            <Mail size={20} />
            <div>
              <p className="eyebrow">Email</p>
              <h2>Email Change</h2>
            </div>
          </div>

          <label className="field">
            <span>New email</span>
            <input
              type="email"
              value={emailForm.newEmail}
              onChange={(event) =>
                setEmailForm({ newEmail: event.target.value })
              }
              disabled={Boolean(emailAction)}
            />
          </label>

          <div className="account-actions">
            <button
              className="button"
              type="submit"
              disabled={Boolean(emailAction)}>
              {emailAction === 'request' ? (
                <>
                  <Loader2 size={18} className="auth-spinner" />
                  Sending
                </>
              ) : (
                <>
                  <Mail size={18} />
                  Request Verification
                </>
              )}
            </button>
            <button
              className="button button--dark"
              type="button"
              onClick={handleCompleteEmailChange}
              disabled={Boolean(emailAction)}>
              {emailAction === 'complete' ? (
                <>
                  <Loader2 size={18} className="auth-spinner" />
                  Checking
                </>
              ) : (
                <>
                  <Check size={18} />
                  Complete Change
                </>
              )}
            </button>
          </div>

          {emailStatus.message && (
            <p
              className={`account-status account-status--${emailStatus.tone}`}
              role={emailStatus.tone === 'error' ? 'alert' : 'status'}>
              {emailStatus.message}
            </p>
          )}
        </form>

        <form
          className="account-panel surface-card"
          onSubmit={handleChangePassword}>
          <div className="account-panel__header">
            <LockKeyhole size={20} />
            <div>
              <p className="eyebrow">Password</p>
              <h2>Password Change</h2>
            </div>
          </div>

          <div className="account-form-grid">
            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value
                  }))
                }
                disabled={isChangingPassword}
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value
                  }))
                }
                disabled={isChangingPassword}
              />
            </label>
          </div>

          {passwordStatus.message && (
            <p
              className={`account-status account-status--${passwordStatus.tone}`}
              role={passwordStatus.tone === 'error' ? 'alert' : 'status'}>
              {passwordStatus.message}
            </p>
          )}

          <button
            className="button"
            type="submit"
            disabled={isChangingPassword}>
            {isChangingPassword ? (
              <>
                <Loader2 size={18} className="auth-spinner" />
                Saving
              </>
            ) : (
              <>
                <LockKeyhole size={18} />
                Change Password
              </>
            )}
          </button>
        </form>

        <form
          className="account-panel account-panel--danger surface-card"
          onSubmit={handleDeleteAccount}>
          <div className="account-panel__header">
            <ShieldAlert size={20} />
            <div>
              <p className="eyebrow">Danger Zone</p>
              <h2>Delete Account</h2>
            </div>
          </div>

          <div className="account-form-grid">
            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                value={deleteForm.currentPassword}
                onChange={(event) =>
                  setDeleteForm((current) => ({
                    ...current,
                    currentPassword: event.target.value
                  }))
                }
                disabled={isDeletingAccount}
              />
            </label>
            <label className="field">
              <span>Confirm email</span>
              <input
                type="email"
                value={deleteForm.confirmation}
                onChange={(event) =>
                  setDeleteForm((current) => ({
                    ...current,
                    confirmation: event.target.value
                  }))
                }
                disabled={isDeletingAccount}
              />
            </label>
          </div>

          {deleteStatus.message && (
            <p
              className={`account-status account-status--${deleteStatus.tone}`}
              role={deleteStatus.tone === 'error' ? 'alert' : 'status'}>
              {deleteStatus.message}
            </p>
          )}

          <button
            className="button account-danger-button"
            type="submit"
            disabled={isDeletingAccount}>
            {isDeletingAccount ? (
              <>
                <Loader2 size={18} className="auth-spinner" />
                Deleting
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Delete Account
              </>
            )}
          </button>
        </form>
      </section>

      <section
        className="constraints-card surface-card"
        aria-busy={isLoadingConstraints}>
        <div className="constraints-card__header">
          <div>
            <p className="eyebrow">Hard Rules</p>
            <h2>Dietary Rules</h2>
            <p>
              These rules block generated bundles for the whole
              group when a candidate includes a violating
              ingredient.
            </p>
          </div>
          <button
            className="button"
            type="button"
            onClick={handleSaveConstraints}
            disabled={
              isLoadingConstraints || isSavingConstraints
            }>
            {isSavingConstraints ? (
              <>
                <Save size={18} /> Saving
              </>
            ) : (
              <>
                <Check size={18} /> Save Rules
              </>
            )}
          </button>
        </div>

        <div
          className="constraint-summary"
          aria-label="Dietary restriction summary">
          {constraintStats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>

        {isLoadingConstraints ? (
          <StatusMessage
            type="loading"
            title="Loading dietary rules"
            message="Fetching saved profile constraints before showing the editor."
          />
        ) : (
          <div className="constraints-form">
            <DefinitionChecklist
              label="Diets"
              options={definitions.diets}
              values={diets}
              onChange={setDiets}
            />
            <DefinitionChecklist
              label="Intolerances"
              options={definitions.intolerances}
              values={intolerances}
              onChange={setIntolerances}
            />
            <details className="definitions-panel">
              <summary>
                <Info size={16} /> Diet Definitions
              </summary>
              <dl>
                {definitions.diets.map((diet) => (
                  <div key={diet.value}>
                    <dt>{diet.label}</dt>
                    <dd>{diet.description}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <TagInput
              label="Additional Allergies"
              placeholder="Add allergy"
              values={allergies}
              onChange={setAllergies}
            />
            <TagInput
              label="Additional Medical Restrictions"
              placeholder="Add hard restriction"
              values={medicalRestrictions}
              onChange={setMedicalRestrictions}
            />
            <IngredientTypeahead
              selected={neverIncludeIngredients}
              onChange={setNeverIncludeIngredients}
            />
            <section className="preference-section">
              <div className="preference-section__header">
                <p className="eyebrow">Soft Preferences</p>
                <h3>Recipe Direction</h3>
              </div>
              <DefinitionChecklist
                label="Preferred Cuisines"
                options={definitions.cuisines}
                values={preferredCuisines}
                onChange={setPreferredCuisines}
              />
              <DefinitionChecklist
                label="Excluded Cuisines"
                options={definitions.cuisines}
                values={excludedCuisines}
                onChange={setExcludedCuisines}
              />
              <TagInput
                label="Disliked Ingredients"
                placeholder="Add ingredient"
                values={dislikedIngredients}
                onChange={setDislikedIngredients}
              />
              <div className="field">
                <span>Spice Level</span>
                <div
                  className="spice-control"
                  role="group"
                  aria-label="Spice level">
                  {SPICE_LEVELS.map((level) => (
                    <button
                      key={level.label}
                      type="button"
                      className={
                        spiceLevel === level.value ? 'is-active' : ''
                      }
                      aria-pressed={spiceLevel === level.value}
                      onClick={() => setSpiceLevel(level.value)}>
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {constraintError && (
          <StatusMessage
            type="error"
            title="Dietary rules unavailable"
            message={constraintError}
          />
        )}
        {constraintMessage && !constraintError && (
          <p className="constraint-success" role="status">
            <Check size={16} /> {constraintMessage}
          </p>
        )}
        <p className="constraint-note">
          <AlertTriangle size={16} /> Hard rules are stricter
          than preferences and always hide violating bundles.
        </p>
      </section>
    </section>
  );
}
