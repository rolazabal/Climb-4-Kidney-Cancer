const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const t = username.trim();
  if (t.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (!USERNAME_REGEX.test(t)) {
    return { valid: false, error: 'Only letters, numbers, and underscores allowed' };
  }
  return { valid: true };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const t = email.trim();
  if (!t) {
    return { valid: false, error: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(t)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

const BIO_MAX = 150;

export function validateBio(bio: string): { valid: boolean; error?: string } {
  if (bio.length > BIO_MAX) {
    return { valid: false, error: `Bio must be ${BIO_MAX} characters or less` };
  }
  return { valid: true };
}
