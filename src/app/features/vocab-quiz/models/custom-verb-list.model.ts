export interface CustomVerbList {
  id: string;
  name: string;
  description?: string;
  verbInfinitives: string[]; // Store infinitive forms
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomVerbListWithVerbs extends CustomVerbList {
  verbs: any[]; // Full verb objects
}
