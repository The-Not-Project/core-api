import type { Request, Response } from "express";
import {
  deleteStoryCategories,
  fetchStories,
  flattenCategories,
  processCategories,
  STORY_RELATIONS,
} from "../.helpers/story.helpers.js";
import { prisma } from "@/prisma/index.js";
import { processStoryAssets } from "../.helpers/file.helpers.js";

export async function getStories(req: Request, res: Response) {
  try {
    const { search, boroughs, categories } = req.query;

    const queryFilter: any = {
      isPublished: true,
    };

    if (typeof search === "string" && search) {
      queryFilter.title = { contains: search };
    }

    if (typeof boroughs === "string" && boroughs.length > 0) {
      queryFilter.borough = { in: boroughs.split(",") };
    }

    if (typeof categories === "string" && categories.length > 0) {
      queryFilter.categories = {
        some: { categoryId: { in: categories.split(",") } },
      };
    }

    const stories = await fetchStories({
      where: queryFilter,
      omit: { content: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(stories);
  } catch (err) {
    console.error("Error in getStories:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
}

export async function getHiddenStories(req: Request, res: Response) {
  try {
    const stories = await fetchStories({
      where: { isPublished: false },
    });

    res.json(stories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hidden stories" });
  }
}

export async function getStory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!id) return res.status(400).json({ error: "MISSING_STORY_ID" });

    const story = await prisma.story.findUnique({
      where: { id: id as string },
      include: {
        ...STORY_RELATIONS.include,
        save: userId ? { where: { userId: String(userId) } } : false,
      },
    });

    if (!story || !story.isPublished) {
      return res.status(404).json({ error: "NOT_fOUND_OR_NOT_PUBLISHED" });
    }

    const flatStory = flattenCategories(story);

    const responseData = {
      ...flatStory,
      isSaved: Array.isArray(story.save) && story.save.length > 0,
    };

    delete (responseData as any).save;

    res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch story" });
  }
}

export async function createStory(req: Request, res: Response) {
  try {
    const { title, content, borough, summary, authorId } = req.body;
    const categoryIds = Array.isArray(req.body.categoryIds)
      ? req.body.categoryIds
      : req.body.categoryIds
        ? [req.body.categoryIds]
        : [];

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const thumbnailFile = files["thumbnail"]?.[0];
    const editorFiles = files["editor_images"] || [];

    if (!thumbnailFile)
      return res.status(400).json({ error: "Thumbnail is required" });

    const { updatedContent, thumbnailUrl } = await processStoryAssets(
      title,
      content,
      thumbnailFile,
      editorFiles,
    );

    if (!thumbnailUrl)
      return res.status(400).json({ error: "Failed to process thumbnail" });

    const newStory = await prisma.story.create({
      data: {
        title,
        content: updatedContent,
        borough,
        summary,
        thumbnail: thumbnailUrl,
        isPublished: true,
        author: { connect: { id: authorId } },
      },
    });

    if (categoryIds.length) {
      await processCategories(newStory.id, categoryIds);
    }

    res.status(201).json(newStory);
  } catch (err) {
    console.error("CREATE_STORY_ERROR:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function editStory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, content, borough, summary, categoryIds } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const thumbnailFile = files["thumbnail"]?.[0];
    const editorFiles = files["editor_images"] || [];

    const { updatedContent, thumbnailUrl } = await processStoryAssets(
      title,
      content,
      thumbnailFile,
      editorFiles,
    );

    await prisma.story.update({
      where: { id: id as string },
      data: {
        title,
        content: updatedContent,
        borough,
        summary,
        ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
      },
    });

    if (categoryIds) {
      const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
      await processCategories(id as string, ids);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("EDIT_STORY_ERROR:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function unpublishStory(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Story ID is required" });
    }

    const updatedStory = await prisma.story.update({
      where: { id: id as string, isRadar: false },
      data: { isPublished: false },
    });

    res.json(updatedStory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unpublish story" });
  }
}

export async function republishStory(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Story ID is required" });
    }

    const updatedStory = await prisma.story.update({
      where: { id: id as string },
      data: { isPublished: true },
    });

    res.json(updatedStory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to republish story" });
  }
}

export async function deleteStory(req: Request, res: Response) {
  try {
    const { id } = Array.isArray(req.params) ? req.params[0] : req.params;

    if (!id) {
      return res.status(400).json({ error: "Story ID is required" });
    }

    const story = await prisma.story.findUnique({ where: { id } });

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    if (story.isRadar || story.isPublished || story.isRecommended) {
      return res.status(400).json({
        error: "Cannot delete published, radar, or recommended story",
      });
    }

    await deleteStoryCategories(id);

    await prisma.story.delete({ where: { id } });

    res.json({ message: "Story deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete story" });
  }
}
