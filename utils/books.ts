import { File, Paths, Directory } from "expo-file-system";
import * as Linking from "expo-linking";

const BOOKS_DIR_NAME = "books";

function getBooksDir(): Directory {
	return new Directory(Paths.document, BOOKS_DIR_NAME);
}

export async function ensureBooksDir() {
	const dir = getBooksDir();
	if (!dir.exists) {
		dir.create();
	}
}

export async function importEpub(sourceUri: string, fileName: string): Promise<string> {
	ensureBooksDir();
	const destName = `${Date.now()}_${fileName}`;
	const destFile = new File(getBooksDir(), destName);
	const sourceFile = new File(sourceUri);
	sourceFile.copy(destFile);
	return destFile.uri;
}

export async function deleteBookFile(filePath: string): Promise<void> {
	try {
		const file = new File(filePath);
		if (file.exists) {
			file.delete();
		}
	} catch {
		// File already deleted
	}
}

export function formatReadingTime(minutes: number): string {
	if (minutes < 1) return "< 1 min left";
	if (minutes < 60) return `${Math.round(minutes)} min left`;
	const hours = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);
	if (mins === 0) return `${hours} hr left`;
	return `${hours} hr ${mins} min left`;
}

export function estimateTimeRemaining(
	currentPage: number,
	totalPages: number,
	readingStartTime: number,
	startPage: number
): string {
	if (totalPages === 0 || currentPage === 0) return "";
	const pagesRead = currentPage - startPage;
	if (pagesRead <= 0) {
		const remaining = totalPages - currentPage;
		const avgMinPerPage = 1.5;
		return formatReadingTime(remaining * avgMinPerPage);
	}
	const elapsed = (Date.now() - readingStartTime) / 60000;
	const minPerPage = elapsed / pagesRead;
	const remaining = totalPages - currentPage;
	return formatReadingTime(remaining * minPerPage);
}

export function getProgressPercent(current: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((current / total) * 100);
}

export function openInAudible(title: string) {
	const query = encodeURIComponent(title);
	Linking.openURL(`https://www.audible.com/search?keywords=${query}`);
}
