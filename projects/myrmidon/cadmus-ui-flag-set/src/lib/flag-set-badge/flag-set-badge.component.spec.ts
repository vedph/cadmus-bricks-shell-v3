import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';

import { Flag } from '../flag-set/flag-set.component';
import { FlagSetBadgeComponent } from './flag-set-badge.component';

describe('FlagSetBadgeComponent', () => {
  let component: FlagSetBadgeComponent;
  let fixture: ComponentFixture<FlagSetBadgeComponent>;

  const flags: Flag[] = [
    { id: 'f1', label: 'Alpha' },
    { id: 'f2', label: 'Beta' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagSetBadgeComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(FlagSetBadgeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.flags()).toEqual([]);
    expect(component.noInitials()).toBe(false);
    expect(component.flagSymbol()).toBe('●');
    expect(component.flagSize()).toBe('1em');
  });

  it('should render nothing when flags is empty', () => {
    fixture.detectChanges();
    const badges = fixture.debugElement.queryAll(By.css('.badge'));
    expect(badges.length).toBe(0);
  });

  it('should render a badge for each flag', async () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.detectChanges();
    await fixture.whenStable();

    const badges = fixture.debugElement.queryAll(By.css('.badge'));
    expect(badges.length).toBe(2);
  });

  it('should compute initials from flag labels by default', () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.detectChanges();

    expect(component.flagInitials()).toEqual(['AL', 'BE']);
  });

  it('should show initials text in the badge when noInitials is false', async () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.detectChanges();
    await fixture.whenStable();

    const spans = fixture.debugElement.queryAll(By.css('.badge span'));
    expect(spans[0].nativeElement.textContent.trim()).toBe('AL');
    expect(spans[1].nativeElement.textContent.trim()).toBe('BE');
  });

  it('should return an empty initials array when noInitials is true', () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.componentRef.setInput('noInitials', true);
    fixture.detectChanges();

    expect(component.flagInitials()).toEqual([]);
  });

  it('should show the flag symbol instead of initials when noInitials is true', async () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.componentRef.setInput('noInitials', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const spans = fixture.debugElement.queryAll(By.css('.badge span'));
    expect(spans[0].nativeElement.textContent.trim()).toBe('●');
  });

  it('should use a custom flag symbol when provided', async () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.componentRef.setInput('noInitials', true);
    fixture.componentRef.setInput('flagSymbol', '*');
    fixture.detectChanges();
    await fixture.whenStable();

    const spans = fixture.debugElement.queryAll(By.css('.badge span'));
    expect(spans[0].nativeElement.textContent.trim()).toBe('*');
  });

  it('should apply a custom flag size to the symbol span', async () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.componentRef.setInput('flagSize', '2em');
    fixture.detectChanges();
    await fixture.whenStable();

    const spans = fixture.debugElement.queryAll(By.css('.badge span'));
    expect(spans[0].nativeElement.style.fontSize).toBe('2em');
  });

  it('should use the explicit flag color when provided', () => {
    const coloredFlags: Flag[] = [{ id: 'f1', label: 'Alpha', color: '#ff0000' }];
    fixture.componentRef.setInput('flags', coloredFlags);
    fixture.detectChanges();

    expect(component.flagColors()).toEqual(['#ff0000']);
  });

  it('should generate a deterministic hsl color when no color is provided', () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.detectChanges();

    const colors = component.flagColors();
    expect(colors.length).toBe(2);
    colors.forEach((c) => expect(c).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/));

    // deterministic: same id -> same color across recomputation
    const colorsAgain = component.flagColors();
    expect(colorsAgain).toEqual(colors);
  });

  it('should generate different colors for different ids (in general)', () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.detectChanges();

    const [c1, c2] = component.flagColors();
    expect(c1).not.toBe(c2);
  });

  it('should set the badge background color from flagColors', async () => {
    const coloredFlags: Flag[] = [{ id: 'f1', label: 'Alpha', color: 'rgb(1, 2, 3)' }];
    fixture.componentRef.setInput('flags', coloredFlags);
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.debugElement.query(By.css('.badge'));
    expect(badge.nativeElement.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('should set the tooltip to the flag label', async () => {
    fixture.componentRef.setInput('flags', flags);
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.debugElement.query(By.css('.badge'));
    const tooltip = badge.injector.get(MatTooltip);
    expect(tooltip.message).toBe('Alpha');
  });

  it('should disambiguate initials for flags sharing the same first two letters', () => {
    const collidingFlags: Flag[] = [
      { id: 'f1', label: 'Alphabet' },
      { id: 'f2', label: 'Almanac' },
    ];
    fixture.componentRef.setInput('flags', collidingFlags);
    fixture.detectChanges();

    const initials = component.flagInitials();
    expect(initials.length).toBe(2);
    // both entries must be produced without throwing, and be distinct
    expect(initials[0]).not.toBe(initials[1]);
  });
});
