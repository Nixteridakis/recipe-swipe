import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

export function getSanityWriteClient() {
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!token) return null;

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
  });
}
