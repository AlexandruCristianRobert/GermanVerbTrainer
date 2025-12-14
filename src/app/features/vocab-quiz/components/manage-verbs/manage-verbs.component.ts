import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomVerbListService } from '../../services/custom-verb-list.service';
import { VerbService } from '../../../quiz/services/verb.service';
import { CustomVerbList } from '../../models/custom-verb-list.model';
import { Verb, VerbFilters } from '../../../../core/models';

@Component({
  selector: 'app-manage-verbs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './manage-verbs.component.html',
  styleUrls: ['./manage-verbs.component.scss'],
})
export class ManageVerbsComponent implements OnInit {
  customLists: CustomVerbList[] = [];
  selectedList: CustomVerbList | null = null;
  selectedListVerbs: Verb[] = [];

  // For creating/editing lists
  isCreatingList = false;
  isEditingList = false;
  listName = '';
  listDescription = '';

  // For selecting verbs
  isSelectingVerbs = false;
  availableVerbs: Verb[] = [];
  selectedVerbsForAdding: Set<string> = new Set();
  searchQuery = '';

  // Filters for verb selection
  filterDifficulty: number | null = null;
  filterVerbType: string | null = null;

  // Available options
  difficultyLevels = [1, 2, 3];
  verbTypes: string[] = [];

  constructor(
    private customListService: CustomVerbListService,
    private verbService: VerbService
  ) {}

  ngOnInit(): void {
    this.loadLists();
    this.loadVerbTypes();
  }

  loadLists(): void {
    this.customLists = this.customListService.getAllLists();
  }

  loadVerbTypes(): void {
    const allVerbs = this.verbService.getVerbs();
    const types = new Set<string>();
    allVerbs.forEach((verb) => types.add(verb.verb_type));
    this.verbTypes = Array.from(types).sort();
  }

  selectList(list: CustomVerbList): void {
    this.selectedList = list;
    this.selectedListVerbs = this.customListService.getVerbsForList(list.id);
    this.isSelectingVerbs = false;
  }

  startCreateList(): void {
    this.isCreatingList = true;
    this.isEditingList = false;
    this.listName = '';
    this.listDescription = '';
  }

  startEditList(): void {
    if (!this.selectedList) return;

    this.isEditingList = true;
    this.isCreatingList = false;
    this.listName = this.selectedList.name;
    this.listDescription = this.selectedList.description || '';
  }

  cancelListForm(): void {
    this.isCreatingList = false;
    this.isEditingList = false;
    this.listName = '';
    this.listDescription = '';
  }

  saveList(): void {
    if (!this.listName.trim()) return;

    if (this.isCreatingList) {
      const newList = this.customListService.createList(
        this.listName.trim(),
        this.listDescription.trim(),
        []
      );
      this.loadLists();
      this.selectList(newList);
    } else if (this.isEditingList && this.selectedList) {
      this.customListService.updateList(this.selectedList.id, {
        name: this.listName.trim(),
        description: this.listDescription.trim(),
      });
      this.loadLists();
      const updated = this.customLists.find(
        (l) => l.id === this.selectedList!.id
      );
      if (updated) {
        this.selectList(updated);
      }
    }

    this.cancelListForm();
  }

  deleteList(list: CustomVerbList, event: Event): void {
    event.stopPropagation();

    if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
      this.customListService.deleteList(list.id);
      this.loadLists();
      if (this.selectedList?.id === list.id) {
        this.selectedList = null;
        this.selectedListVerbs = [];
      }
    }
  }

  startSelectingVerbs(): void {
    this.isSelectingVerbs = true;
    this.loadAvailableVerbs();
    this.selectedVerbsForAdding.clear();
  }

  cancelSelectingVerbs(): void {
    this.isSelectingVerbs = false;
    this.selectedVerbsForAdding.clear();
    this.searchQuery = '';
    this.filterDifficulty = null;
    this.filterVerbType = null;
  }

  loadAvailableVerbs(): void {
    const filters: VerbFilters = {};

    if (this.filterDifficulty) {
      filters.difficultyLevels = [this.filterDifficulty];
    }

    if (this.filterVerbType) {
      filters.verbTypes = [this.filterVerbType as any];
    }

    let verbs = this.verbService.getVerbs(filters);

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      verbs = verbs.filter(
        (verb) =>
          verb.infinitive.toLowerCase().includes(query) ||
          verb.english_translation.toLowerCase().includes(query)
      );
    }

    this.availableVerbs = verbs;
  }

  onFilterChange(): void {
    this.loadAvailableVerbs();
  }

  onSearchChange(): void {
    this.loadAvailableVerbs();
  }

  toggleVerbSelection(infinitive: string): void {
    if (this.selectedVerbsForAdding.has(infinitive)) {
      this.selectedVerbsForAdding.delete(infinitive);
    } else {
      this.selectedVerbsForAdding.add(infinitive);
    }
  }

  selectAllVisibleVerbs(): void {
    this.availableVerbs.forEach((verb) => {
      this.selectedVerbsForAdding.add(verb.infinitive);
    });
  }

  clearSelection(): void {
    this.selectedVerbsForAdding.clear();
  }

  selectRandomVerbs(count: number): void {
    this.clearSelection();
    const shuffled = [...this.availableVerbs].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    selected.forEach((verb) =>
      this.selectedVerbsForAdding.add(verb.infinitive)
    );
  }

  addSelectedVerbs(): void {
    if (!this.selectedList || this.selectedVerbsForAdding.size === 0) return;

    this.customListService.addVerbsToList(
      this.selectedList.id,
      Array.from(this.selectedVerbsForAdding)
    );

    this.loadLists();
    const updated = this.customLists.find(
      (l) => l.id === this.selectedList!.id
    );
    if (updated) {
      this.selectList(updated);
    }

    this.cancelSelectingVerbs();
  }

  removeVerbFromList(infinitive: string): void {
    if (!this.selectedList) return;

    if (confirm(`Remove "${infinitive}" from this list?`)) {
      this.customListService.removeVerbsFromList(this.selectedList.id, [
        infinitive,
      ]);
      this.selectedListVerbs = this.selectedListVerbs.filter(
        (v) => v.infinitive !== infinitive
      );

      this.loadLists();
      const updated = this.customLists.find(
        (l) => l.id === this.selectedList!.id
      );
      if (updated) {
        this.selectedList = updated;
      }
    }
  }

  isVerbInList(infinitive: string): boolean {
    return this.selectedListVerbs.some((v) => v.infinitive === infinitive);
  }

  getDifficultyLabel(level: number): string {
    const labels: Record<number, string> = {
      1: 'Beginner (A1-A2)',
      2: 'Intermediate (B1-B2)',
      3: 'Advanced (C1-C2)',
    };
    return labels[level] || `Level ${level}`;
  }
}
