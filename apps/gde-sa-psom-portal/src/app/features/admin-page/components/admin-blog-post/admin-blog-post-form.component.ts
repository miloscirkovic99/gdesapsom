import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { debounceTime, map } from 'rxjs';
import {
  BLOG_COVER_URL_PATTERN,
  BLOG_SLUG_PATTERN,
  BlogAdminApi,
  BlogCategory,
  BlogPostPayload,
  BlogPostStatus,
  blogPostApiError,
  BlogTag,
  CreatedBlogPost,
  normalizeSearchText,
  Notifier,
  postCoverUrl,
  slugifyTitle,
} from '@gde/shared/data-access';
import { RouteConstants } from '@gde/shared/util';

type FieldName = keyof BlogPostPayload;

/** Validators.required lets "   " through; the handler trims and rejects it. */
function requiredText(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim() ? null : { required: true };
}

/**
 * Admin form for a new blog post (`POST blog/create`).
 *
 * The slug follows the title until the admin types in the slug field. The
 * content is raw HTML with a live preview that goes through Angular's
 * sanitiser like the article page, so whatever the preview drops, the site
 * drops too. A 400/409 from the handler lands on the field it names.
 */
@Component({
  selector: 'app-admin-blog-post-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, NgxMatSelectSearchModule, TranslocoModule],
  templateUrl: './admin-blog-post-form.component.html',
  styleUrls: ['../admin-dialog.scss', './admin-blog-post-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBlogPostFormComponent implements OnInit {
  readonly #api = inject(BlogAdminApi);
  readonly #notifier = inject(Notifier);
  readonly #transloco = inject(TranslocoService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(FormBuilder);

  readonly form = this.#fb.nonNullable.group({
    naslov: ['', [requiredText, Validators.maxLength(255)]],
    slug: ['', [Validators.maxLength(255), Validators.pattern(BLOG_SLUG_PATTERN)]],
    sadrzaj: ['', requiredText],
    kategorijaId: this.#fb.control<number | null>(null),
    tagIds: this.#fb.nonNullable.control<number[]>([]),
    slikaNaslovna: ['', [Validators.maxLength(500), Validators.pattern(BLOG_COVER_URL_PATTERN)]],
    status: this.#fb.nonNullable.control<BlogPostStatus>('draft'),
  });

  readonly categories = signal<BlogCategory[]>([]);
  readonly tags = signal<BlogTag[]>([]);
  readonly lookupsFailed = signal(false);
  readonly isSaving = signal(false);
  /** A message the handler did not tie to a field (401, 403, network, 5xx). */
  readonly formError = signal<string | null>(null);
  readonly slugSuggestion = signal<string | null>(null);
  /** False until the admin types in the slug field; while false the slug follows the title. */
  readonly slugIsManual = signal(false);
  readonly lastDraft = signal<CreatedBlogPost | null>(null);

  readonly tagFilterCtrl = new FormControl('', { nonNullable: true });
  readonly #tagFilter = toSignal(this.tagFilterCtrl.valueChanges, { initialValue: '' });
  readonly filteredTags = computed(() => {
    const term = normalizeSearchText(this.#tagFilter());
    const tags = this.tags();
    return term ? tags.filter((tag) => normalizeSearchText(tag.naziv).includes(term)) : tags;
  });

  /** Debounced so a long post is not re-sanitised on every keystroke. */
  readonly contentPreview = toSignal(this.form.controls.sadrzaj.valueChanges.pipe(debounceTime(250)), {
    initialValue: '',
  });

  readonly coverUrl = toSignal(
    this.form.controls.slikaNaslovna.valueChanges.pipe(
      debounceTime(300),
      map((value) => (BLOG_COVER_URL_PATTERN.test(value.trim()) ? postCoverUrl(value) : null)),
    ),
    { initialValue: null },
  );
  /** The cover URL that failed to load; the warning goes away as soon as the URL changes. */
  readonly brokenCover = signal<string | null>(null);

  ngOnInit(): void {
    this.form.controls.naslov.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((naslov) => {
      if (!this.slugIsManual()) this.form.controls.slug.setValue(slugifyTitle(naslov));
    });

    // The form works without them (both are optional), so a failure is only a warning.
    this.#api
      .listCategories()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => this.lookupsFailed.set(true),
      });
    this.#api
      .listTags()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (tags) => this.tags.set(tags),
        error: () => this.lookupsFailed.set(true),
      });
  }

  /** Typing in the slug field takes it over; clearing it hands it back to the title. */
  onSlugInput(): void {
    this.slugIsManual.set(this.form.controls.slug.value !== '');
  }

  slugFromTitle(): void {
    this.slugIsManual.set(false);
    this.form.controls.slug.setValue(slugifyTitle(this.form.controls.naslov.value));
  }

  useSuggestedSlug(slug: string): void {
    this.slugIsManual.set(true);
    this.slugSuggestion.set(null);
    this.form.controls.slug.setValue(slug);
  }

  showError(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  /** The handler's own message first, then the client-side rule that failed. */
  errorText(name: FieldName): string {
    const errors = this.form.controls[name].errors ?? {};
    if (typeof errors['server'] === 'string') return errors['server'];
    if (errors['required']) return this.#transloco.translate('admin_blog_required');
    if (errors['maxlength']) {
      return this.#transloco.translate('admin_blog_too_long', { max: errors['maxlength'].requiredLength });
    }
    if (errors['pattern']) {
      return this.#transloco.translate(name === 'slug' ? 'admin_blog_slug_invalid' : 'admin_blog_cover_invalid');
    }
    return '';
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: BlogPostPayload = {
      naslov: value.naslov,
      slug: value.slug || null,
      sadrzaj: value.sadrzaj,
      kategorijaId: value.kategorijaId,
      slikaNaslovna: value.slikaNaslovna || null,
      status: value.status,
      tagIds: value.tagIds,
    };

    this.isSaving.set(true);
    this.formError.set(null);
    this.slugSuggestion.set(null);
    this.#api
      .createPost(payload)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (post) => this.#saved(post),
        error: (error: unknown) => {
          this.isSaving.set(false);
          this.#showServerError(error);
        },
      });
  }

  #saved(post: CreatedBlogPost): void {
    this.isSaving.set(false);
    const published = post.status === 'objavljen';
    this.#notifier.notify(
      this.#transloco.translate(published ? 'admin_blog_published' : 'admin_blog_draft_saved'),
      'success',
      this.#transloco.translate('close'),
    );

    // There is no admin list of posts; a published post is shown on its own page.
    if (published) {
      void this.#router.navigate(['/', RouteConstants.blog, post.slug]);
      return;
    }

    // A draft has no page yet (blog/getAll/:slug serves published posts only),
    // so the form stays, empty, for the next post.
    this.lastDraft.set(post);
    this.slugIsManual.set(false);
    this.tagFilterCtrl.setValue('');
    this.form.reset();
  }

  #showServerError(error: unknown): void {
    const apiError = blogPostApiError(error);
    if (!apiError) {
      this.formError.set(this.#transloco.translate('admin_error'));
      return;
    }
    if (!apiError.field) {
      this.formError.set(apiError.message);
      return;
    }

    // Editing the field re-runs its validators, which clears the server error.
    const control = this.form.controls[apiError.field];
    control.setErrors({ ...(control.errors ?? {}), server: apiError.message });
    control.markAsTouched();
    if (apiError.field === 'slug') this.slugSuggestion.set(apiError.suggestedSlug);
  }
}
