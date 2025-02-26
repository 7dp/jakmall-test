type CategoriesResponse = {
  error: boolean;
  categories: string[];
  categoryAliases: {
    alias: string;
    resolved: string;
  }[];
  timestamp: number;
};

type Joke = {
  category: string;
  type: string;
  joke: string;
  flags: {
    nsfw: boolean;
    religious: boolean;
    political: boolean;
    racist: boolean;
    sexist: boolean;
    explicit: boolean;
  };
  id: number;
  safe: boolean;
  lang: string;
};

type JokesResponse = {
  error: boolean;
  amount?: number;
  jokes?: Joke[];
  message?: string;
};

export { CategoriesResponse, JokesResponse, Joke };
