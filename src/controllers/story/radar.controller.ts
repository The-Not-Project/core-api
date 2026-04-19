import type { Request, Response } from "express";
import { flattenCategories, STORY_RELATIONS } from "../.helpers/story.helpers.js";
import { prisma } from "@/prisma/index.js";

export async function getRadarStory(_req: Request, res: Response) {
  try {
    let story = await prisma.story.findFirst({
      where: { isPublished: true, isRadar: true },
      ...STORY_RELATIONS
    });

    if (!story) {
      const recommended = await prisma.story.findFirst({
        where: { isPublished: true, isRecommended: true },
      ...STORY_RELATIONS
      });
      if (recommended) {
        await prisma.story.update({
          where: { id: recommended.id },
          data: { isRadar: true },
        });
        story = recommended;
      }
    }

    if (!story) {
      const fallback = await prisma.story.findFirst({
        where: { isPublished: true, isRecommended: false },
      ...STORY_RELATIONS
      });
      if (fallback) {
        await prisma.story.update({
          where: { id: fallback.id },
          data: { isRadar: true },
        });
        story = fallback;
      }
    }

    if (!story)
      return res.status(404).json({ error: "No story available for radar" });

    res.json(flattenCategories(story));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch radar story" });
  }
};

export async function updateRadarStory (req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "Story ID is required" });

    await prisma.$transaction(async (tx) => {
      const story = await tx.story.findUnique({
        where: { id: id as string },
        select: { isPublished: true },
      });

      if (!story) {
        throw new Error("NOT_FOUND_OR_UNPUBLISHED");
      }

      await tx.story.updateMany({
        where: { isRadar: true },
        data: { isRadar: false },
      });

      await tx.story.update({
        where: { id: id as string },
        data: { isRadar: true },
      });
    });

    res.status(204).send();
  } catch (err: any) {
    if (err.message === "NOT_FOUND_OR_UNPUBLISHED") {
      return res
        .status(404)
        .json({ error: "Story not found or not published" });
    }

    console.error("Radar Update Error:", err);
    res.status(500).json({ error: "Failed to update radar story" });
  }
};