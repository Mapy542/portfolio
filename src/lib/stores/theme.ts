import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export const Themes = {
    Light: 'Light',
    Dark: 'Dark'
} as const;

export type Theme = (typeof Themes)[keyof typeof Themes];

function isTheme(value: unknown): value is Theme {
    return value === Themes.Light || value === Themes.Dark;
}

const initialTheme: Theme = browser
    ? isTheme(localStorage.getItem('theme'))
        ? (localStorage.getItem('theme') as Theme)
        : Themes.Dark
    : Themes.Dark;

export const theme = writable<Theme>(initialTheme);

if (browser) {
    theme.subscribe((value) => {
        localStorage.setItem('theme', value);
    });
}
