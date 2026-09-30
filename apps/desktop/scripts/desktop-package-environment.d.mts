/** Load platform-local release settings without changing the caller's process environment. */

/**
 * Read target release settings or isolated local macOS unsigned defaults.
 * @param platform Target platform.
 * @param environment Parent environment, retained only for unrelated build tools.
 * @param appRoot Desktop application directory; relative credential paths resolve here.
 * @param options Packaging mode.
 * @returns Isolated environment with file-owned release settings or local macOS defaults.
 */
export function loadDesktopPackageEnvironment(
  platform: 'win32' | 'darwin',
  environment?: NodeJS.ProcessEnv,
  appRoot?: string,
  options?: { unsigned?: boolean },
): NodeJS.ProcessEnv

/**
 * Validate release configuration before preparation without invoking a token or Apple's services.
 * @param environment File-owned release settings.
 * @param target Selected release target.
 * @param options Explicit packaging mode.
 * @returns Nothing.
 */
export function validateDesktopPackageEnvironment(
  environment: NodeJS.ProcessEnv,
  target: { platform: 'win32' | 'darwin', arch: string },
  options?: { unsigned?: boolean, prepareOnly?: boolean },
): void
