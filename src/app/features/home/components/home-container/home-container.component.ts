// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\features\home\components\home-container\home-container.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginFormComponent } from '../login-form/login-form.component';
import { RegisterFormComponent } from '../register-form/register-form.component';

@Component({
  selector: 'app-home-container',
  standalone: true,
  imports: [CommonModule, LoginFormComponent, RegisterFormComponent],
  templateUrl: './home-container.component.html',
  styleUrls: ['./home-container.component.scss'],
})
export class HomeContainerComponent implements OnInit {
  showLoginForm = true;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // If already authenticated, redirect to config
    if (this.authService.isAuthenticated()) {
      console.log('✅ User already authenticated, redirecting to /config');
      this.router.navigate(['/config']);
    }
  }

  switchToLogin(): void {
    this.showLoginForm = true;
  }

  switchToRegister(): void {
    this.showLoginForm = false;
  }
}
