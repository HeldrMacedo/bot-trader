import prisma from "../../../lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "success",
      dbConnection: "active",
      region: process.env.VERCEL_REGION,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
      dbUrl: process.env.DATABASE_URL,
      vercelRegion: process.env.VERCEL_REGION,
    });
  }
}
