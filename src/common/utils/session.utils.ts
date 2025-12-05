import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Validates, trims, and decodes a session token
 * @param session - The session token to validate and process
 * @param errorMessage - Optional custom error message (default: 'Session token is required')
 * @returns The decoded session token
 * @throws HttpException if the session token is invalid
 */
export function validateAndDecodeSession(
  session: string,
  errorMessage: string = 'Session token is required',
): string {
  if (!session || session === 'undefined' || session === 'null' || !session.trim()) {
    throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
  }

  const trimmedSession = session.trim();
  const decoded = decodeURIComponent(trimmedSession);

  return decoded;
}

