import { useParams } from "react-router-dom";

/**
 * Returns the current portal slug and base path for building portal URLs.
 * Used by all patient portal components to ensure links stay within the slug context.
 */
export function usePortalSlug() {
  const { slug } = useParams<{ slug: string }>();
  const basePath = slug ? `/p/${slug}/portal` : "/portal";
  return { slug, basePath };
}
