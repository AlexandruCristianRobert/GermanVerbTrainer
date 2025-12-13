// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\features\home\components\register-form\register-form.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-form.component.html',
  styleUrls: ['./register-form.component.scss'],
})
export class RegisterFormComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            this.passwordStrengthValidator,
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  // Custom validator for password strength
  private passwordStrengthValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    const isValid = hasUpperCase && hasLowerCase && hasNumber;

    return isValid ? null : { weak: true };
  }

  // Custom validator for password confirmation
  private passwordsMatchValidator(
    formGroup: AbstractControl
  ): ValidationErrors | null {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    // Mark all fields as touched to show validation errors
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { fullName, email, password } = this.registerForm.value;

    this.authService
      .signUp(email, password, { full_name: fullName })
      .subscribe({
        next: ({ user, error }) => {
          this.isLoading = false;

          if (error) {
            console.error('❌ Registration failed:', error);
            this.errorMessage = this.getErrorMessage(error);
            return;
          }

          if (user) {
            console.log('✅ Registration successful:', user.email);
            this.successMessage =
              'Account created successfully! Redirecting...';

            // Redirect to config after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/config']);
            }, 2000);
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('❌ Registration error:', err);
          this.errorMessage = 'An unexpected error occurred. Please try again.';
        },
      });
  }

  private getErrorMessage(error: any): string {
    const message = error.message?.toLowerCase() || '';

    if (
      message.includes('already registered') ||
      message.includes('already exists')
    ) {
      return 'This email is already registered. Please login instead.';
    }
    if (message.includes('invalid email')) {
      return 'Please enter a valid email address.';
    }
    if (message.includes('weak password')) {
      return 'Password is too weak. Please use a stronger password.';
    }

    return error.message || 'Registration failed. Please try again.';
  }

  getPasswordStrength(): 'weak' | 'medium' | 'strong' {
    const password = this.registerForm.get('password')?.value || '';

    if (password.length < 8) return 'weak';

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const score = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(
      Boolean
    ).length;

    if (score >= 4) return 'strong';
    if (score >= 3) return 'medium';
    return 'weak';
  }

  // Getters for form controls
  get fullName() {
    return this.registerForm.get('fullName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
}
