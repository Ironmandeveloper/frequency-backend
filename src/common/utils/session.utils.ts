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

// Helper function to calculate difference
export const calculateDifference = (
  current: { gain: number },
  previous: { gain: number },
) => {
  const diff = current.gain - previous.gain;
  const diffPercent =
    previous.gain !== 0 ? (diff / Math.abs(previous.gain)) * 100 : 0;
  return {
    difference: Number(diff.toFixed(2)),
    differencePercent: Number(diffPercent.toFixed(2)),
  };
};


// Helper function to calculate differences
export const calculateDifferences = (
  current: { totalProfit: number; totalPips: number },
  previous: { totalProfit: number; totalPips: number },
) => {
  return {
    profitDifference: Number(
      (current.totalProfit - previous.totalProfit).toFixed(2),
    ),
    pipsDifference: Number(
      (current.totalPips - previous.totalPips).toFixed(2),
    ),
  };
};

