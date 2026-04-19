import type { Request, Response } from "express";
import { prisma } from "@/prisma/index.js";
import { fetchStories } from "../.helpers/story.helpers.js";

export async function createStorySave(req: Request, res: Response) {
  try {
    const { storyId, userId } = req.body;

    if (!storyId || !userId) {
      return res.status(400).json({ error: "storyId and userId are required" });
    }

    await prisma.save.create({
      data: { storyId, userId },
    });

    res.status(201).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save story" });
  }
}

export async function getSavedStories(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const stories = await fetchStories({
      where: {
        save: {
          some: {
            userId: userId as string,
          },
        },
      },
    });

    res.json(stories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch saved stories" });
  }
}

export async function deleteStorySave(req: Request, res: Response) {
  try {
    const { storyId, userId } = req.body;

    if (!storyId || !userId) {
      return res.status(400).json({ error: "storyId and userId are required" });
    }

    await prisma.save.deleteMany({
      where: { storyId: storyId as string, userId: userId as string },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unsave story" });
  }
}
