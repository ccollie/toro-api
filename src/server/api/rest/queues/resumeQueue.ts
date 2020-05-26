import { asyncHandler } from '../middleware';

export const resumeQueue = asyncHandler(async (req, res) => {
  const { queue } = res.locals;

  await queue.resume();

  res.json({ isPaused: false });
});
