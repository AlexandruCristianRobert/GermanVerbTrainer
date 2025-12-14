import { Injectable } from '@angular/core';
import { CustomVerbList } from '../models/custom-verb-list.model';
import { Verb } from '../../../core/models';
import { VerbService } from '../../quiz/services/verb.service';

@Injectable({
  providedIn: 'root',
})
export class CustomVerbListService {
  private readonly STORAGE_KEY = 'custom_verb_lists';

  constructor(private verbService: VerbService) {}

  /**
   * Get all custom verb lists
   */
  getAllLists(): CustomVerbList[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      const lists = JSON.parse(stored);
      // Convert date strings back to Date objects
      return lists.map((list: any) => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt),
      }));
    } catch (error) {
      console.error('Error parsing custom verb lists:', error);
      return [];
    }
  }

  /**
   * Get a specific list by ID
   */
  getListById(id: string): CustomVerbList | undefined {
    const lists = this.getAllLists();
    return lists.find((list) => list.id === id);
  }

  /**
   * Get verbs for a specific list
   */
  getVerbsForList(listId: string): Verb[] {
    const list = this.getListById(listId);
    if (!list) {
      return [];
    }

    return list.verbInfinitives
      .map((infinitive) => this.verbService.getVerbByInfinitive(infinitive))
      .filter((verb): verb is Verb => verb !== undefined);
  }

  /**
   * Create a new custom verb list
   */
  createList(
    name: string,
    description: string,
    verbInfinitives: string[]
  ): CustomVerbList {
    const lists = this.getAllLists();

    const newList: CustomVerbList = {
      id: this.generateId(),
      name,
      description,
      verbInfinitives,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    lists.push(newList);
    this.saveLists(lists);

    return newList;
  }

  /**
   * Update an existing list
   */
  updateList(
    id: string,
    updates: Partial<Omit<CustomVerbList, 'id' | 'createdAt'>>
  ): boolean {
    const lists = this.getAllLists();
    const index = lists.findIndex((list) => list.id === id);

    if (index === -1) {
      return false;
    }

    lists[index] = {
      ...lists[index],
      ...updates,
      updatedAt: new Date(),
    };

    this.saveLists(lists);
    return true;
  }

  /**
   * Delete a list
   */
  deleteList(id: string): boolean {
    const lists = this.getAllLists();
    const filteredLists = lists.filter((list) => list.id !== id);

    if (filteredLists.length === lists.length) {
      return false; // List not found
    }

    this.saveLists(filteredLists);
    return true;
  }

  /**
   * Add verbs to a list
   */
  addVerbsToList(listId: string, verbInfinitives: string[]): boolean {
    const lists = this.getAllLists();
    const list = lists.find((l) => l.id === listId);

    if (!list) {
      return false;
    }

    // Add only unique verbs
    const existingSet = new Set(list.verbInfinitives);
    verbInfinitives.forEach((inf) => existingSet.add(inf));
    list.verbInfinitives = Array.from(existingSet);
    list.updatedAt = new Date();

    this.saveLists(lists);
    return true;
  }

  /**
   * Remove verbs from a list
   */
  removeVerbsFromList(listId: string, verbInfinitives: string[]): boolean {
    const lists = this.getAllLists();
    const list = lists.find((l) => l.id === listId);

    if (!list) {
      return false;
    }

    const toRemove = new Set(verbInfinitives);
    list.verbInfinitives = list.verbInfinitives.filter(
      (inf) => !toRemove.has(inf)
    );
    list.updatedAt = new Date();

    this.saveLists(lists);
    return true;
  }

  /**
   * Get random verbs from a custom list
   */
  getRandomVerbsFromList(listId: string, count: number): Verb[] {
    const verbs = this.getVerbsForList(listId);

    if (verbs.length === 0) {
      return [];
    }

    // Fisher-Yates shuffle
    const shuffled = [...verbs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  private saveLists(lists: CustomVerbList[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lists));
  }

  private generateId(): string {
    return `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
