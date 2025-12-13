// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\features\home\components\login-form\login-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss'],
})
export class LoginFormComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    // Mark all fields as touched to show validation errors
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.signIn(email, password).subscribe({
      next: ({ user, error }) => {
        this.isLoading = false;

        if (error) {
          console.error('❌ Login failed:', error);
          this.errorMessage = this.getErrorMessage(error);
          return;
        }

        if (user) {
          console.log('✅ Login successful:', user.email);

          // Check for return URL
          const returnUrl = sessionStorage.getItem('returnUrl') || '/config';
          sessionStorage.removeItem('returnUrl');

          // Navigate to return URL or config
          this.router.navigate([returnUrl]);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Login error:', err);
        this.errorMessage = 'An unexpected error occurred. Please try again.';
      },
    });
  }

  private getErrorMessage(error: any): string {
    const message = error.message?.toLowerCase() || '';

    if (
      message.includes('invalid login credentials') ||
      message.includes('invalid')
    ) {
      return 'Invalid email or password. Please try again.';
    }
    if (message.includes('email not confirmed')) {
      return 'Please verify your email address before logging in.';
    }

    return error.message || 'Login failed. Please try again.';
  }

  // Getter for form controls (for template)
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
