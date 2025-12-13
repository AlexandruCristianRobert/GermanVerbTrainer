import { Routes } from '@angular/router';
import { ConfigFormComponent } from './features/configuration';
import { QuizContainerComponent } from './features/quiz';
import { ResultsSummaryComponent } from './features/results';
import { HomeContainerComponent } from './features/home/components/home-container/home-container.component';
import { VerbUploadComponent } from './features/admin';
import {
  VocabQuizConfigComponent,
  VocabQuizTestComponent,
  VocabQuizResultsComponent,
} from './features/vocab-quiz'; // ADD THIS
import { authGuard } from './core/guards/auth.guard';
import { dataLoadedGuard } from './core/guards/data-loaded.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeContainerComponent,
    data: { title: 'Home' },
  },
  {
    path: 'config',
    component: ConfigFormComponent,
    canActivate: [authGuard, dataLoadedGuard],
    data: { title: 'Configure Quiz' },
  },
  {
    path: 'quiz',
    component: QuizContainerComponent,
    canActivate: [authGuard, dataLoadedGuard],
    data: { title: 'Take Quiz' },
  },
  {
    path: 'results/:id',
    component: ResultsSummaryComponent,
    canActivate: [authGuard],
    data: { title: 'Quiz Results' },
  },
  // ADD VOCABULARY QUIZ ROUTES HERE
  {
    path: 'vocab-quiz',
    canActivate: [authGuard, dataLoadedGuard],
    children: [
      {
        path: '',
        redirectTo: 'config',
        pathMatch: 'full',
      },
      {
        path: 'config',
        component: VocabQuizConfigComponent,
        data: { title: 'Vocabulary Quiz Configuration' },
      },
      {
        path: 'test',
        component: VocabQuizTestComponent,
        data: { title: 'Vocabulary Quiz' },
      },
      {
        path: 'results',
        component: VocabQuizResultsComponent,
        data: { title: 'Vocabulary Quiz Results' },
      },
    ],
  },
  {
    path: 'admin/upload-verbs',
    component: VerbUploadComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Upload Verbs' },
  },
  {
    path: '**',
    redirectTo: '/home',
  },
];
