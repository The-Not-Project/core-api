import { prisma } from "@/prisma/index.js";
import type { Prisma } from "@/generated/client.js";

export function getStoryData(formData: FormData) {
  const [title, content, borough, summary] = [
    "title",
    "content",
    "borough",
    "summary",
  ].map((field) => formData.get(field)?.toString());

  const categoryIds = formData
    .getAll("categories")
    .map((val) => val.toString());

  const thumbnail = formData.get("thumbnail");

  if (!title || !content || !borough || !summary) {
    throw new Error("Missing required story fields");
  }

  return { title, content, borough, summary, categoryIds, thumbnail };
}

export async function processCategories(
  storyId: string,
  categoryIds: string[]
) {
  "use server";

  const tx: Prisma.PrismaPromise<Prisma.BatchPayload>[] = [
    prisma.storycategory.deleteMany({ where: { storyId } }),
  ];

  if (categoryIds.length) {
    tx.push(
      prisma.storycategory.createMany({
        data: categoryIds.map((categoryId) => ({ storyId, categoryId })),
        skipDuplicates: true,
      })
    );
  }

  await prisma.$transaction(tx);
}


export async function deleteStoryCategories(id: string) {
  "use server";

  await prisma.storycategory.deleteMany({
    where: { storyId: id },
  });
}



export const STORY_RELATIONS = {
  include: {
    categories: {
      include: {
        category: true,
      },
    },
    author: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
  },
};

const INTERNAL_FIELDS = {
  isTrashed: true,
  isRecommended: true,
  // isRadar: true,
  content: true,
  updatedAt: true,
};

export type StoryWithRelations = Prisma.storyGetPayload<{
  include: {
    categories: {
      include: {
        category: true;
      };
    };
    author: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
  };
}>;

export async function fetchStories<T extends Prisma.storyFindManyArgs>(
  args: T,
) {
  const stories = (await prisma.story.findMany({
    ...STORY_RELATIONS,
    ...args,
    omit: { ...INTERNAL_FIELDS, ...args.omit },
  })) as StoryWithRelations[];

  return stories.map(flattenCategories);
}

export function flattenCategories(story: StoryWithRelations) {
  return {
    ...story,
    categories: story.categories.map((c) => c.category),
  };
}
