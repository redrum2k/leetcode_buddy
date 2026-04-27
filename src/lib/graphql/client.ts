const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

export interface GqlResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    // host_permissions grants cookie access so the user's session is automatically attached
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Referer: 'https://leetcode.com/',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as GqlResponse<T>;

  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`);
  }

  return json.data;
}
