// e:\Projects\Angular\German Verbs\german-verb-trainer\src\app\shared\components\navigation-header\navigation-header.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-navigation-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navigation-header.component.html',
  styleUrls: ['./navigation-header.component.scss'],
})
export class NavigationHeaderComponent implements OnInit {
  currentUser: User | null = null;
  showMobileMenu = false;
  showUserMenu = false;
  isAdmin = false; // ADD THIS

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Subscribe to current user
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.isAdmin = this.authService.isAdmin(); // ADD THIS
    });
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  onLogout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.signOut().subscribe({
        next: () => {
          console.log('✅ Logged out successfully');
          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('❌ Logout failed:', err);
        },
      });
    }
  }

  getUserInitials(): string {
    if (!this.currentUser?.email) return '?';
    return this.currentUser.email.charAt(0).toUpperCase();
  }

  getUserEmail(): string {
    return this.currentUser?.email || 'Unknown';
  }
}
