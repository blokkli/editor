import type { Language } from '../../../frontend/shared/utils/languages'
import type { AccessError, ClaimError } from '../../shared/utils/claim'

type Texts = {
  site: string
  title: string
  intro: string
  lifetime: string
  premium: string
  languageTitle: string
  languageDescription: string
  submit: string
  pending: string
  errors: Record<ClaimError, string>
  // An access link that didn't log in (?access=…).
  access: Record<AccessError, string>
}

// The claim page's strings. German: formal, Swiss spelling. English: British.
export const CLAIM_TEXTS: Record<Language, Texts> = {
  en: {
    site: 'Blockingen',
    title: 'Try blökkli',
    intro:
      'Get your own copy of the website of Blockingen, a fictional Swiss municipality, and edit it with blökkli. You work as Anna Keller, an editor.',
    lifetime:
      'Your sandbox is deleted after 24 hours, or after 2 hours without use. Nobody else has access to it.',
    premium: 'Premium invitation: your sandbox lasts 21 days.',
    languageTitle: 'Language',
    languageDescription:
      'Your sandbox’s content is written in this language. The other two are its translations.',
    submit: 'Create my sandbox',
    pending: 'Creating your sandbox…',
    errors: {
      template: 'This language isn’t available.',
      turnstile: 'The security check failed. Please try again.',
      rate_limit:
        'You’ve created several sandboxes in the last hour. Please try again later.',
      full: 'All sandboxes are in use at the moment. Please try again later.',
      invitation: 'This invitation has already been used, or doesn’t exist.',
      failed: 'The sandbox couldn’t be created. Please try again.',
    },
    access: {
      unknown:
        'This access link isn’t valid any more. Please ask the person who sent it for a new one.',
      gone: 'The sandbox of this access link no longer exists.',
    },
  },
  de: {
    site: 'Blockingen',
    title: 'blökkli ausprobieren',
    intro:
      'Sie erhalten eine eigene Kopie der Website von Blockingen, einer fiktiven Schweizer Gemeinde, und bearbeiten sie mit blökkli. Sie arbeiten als Anna Keller, Redaktorin.',
    lifetime:
      'Ihre Sandbox wird nach 24 Stunden gelöscht, oder nach 2 Stunden ohne Nutzung. Niemand sonst hat Zugriff darauf.',
    premium: 'Premium-Einladung: Ihre Sandbox bleibt 21 Tage bestehen.',
    languageTitle: 'Sprache',
    languageDescription:
      'Die Inhalte Ihrer Sandbox sind in dieser Sprache verfasst. Die anderen beiden sind Übersetzungen.',
    submit: 'Meine Sandbox erstellen',
    pending: 'Ihre Sandbox wird erstellt …',
    errors: {
      template: 'Diese Sprache ist nicht verfügbar.',
      turnstile:
        'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es noch einmal.',
      rate_limit:
        'Sie haben in der letzten Stunde schon mehrere Sandboxes erstellt. Bitte versuchen Sie es später noch einmal.',
      full: 'Zurzeit sind alle Sandboxes belegt. Bitte versuchen Sie es später noch einmal.',
      invitation:
        'Diese Einladung wurde schon verwendet, oder es gibt sie nicht.',
      failed:
        'Die Sandbox konnte nicht erstellt werden. Bitte versuchen Sie es noch einmal.',
    },
    access: {
      unknown:
        'Dieser Zugangslink ist nicht mehr gültig. Bitte fragen Sie die Person, die ihn Ihnen geschickt hat, nach einem neuen.',
      gone: 'Die Sandbox dieses Zugangslinks gibt es nicht mehr.',
    },
  },
  fr: {
    site: 'Bloquens',
    title: 'Essayer blökkli',
    intro:
      'Vous recevez votre propre copie du site web de Bloquens, une commune suisse fictive, et vous la modifiez avec blökkli. Vous travaillez en tant qu’Anna Keller, rédactrice.',
    lifetime:
      'Votre sandbox est supprimée après 24 heures, ou après 2 heures sans utilisation. Personne d’autre n’y a accès.',
    premium: 'Invitation premium : votre sandbox reste disponible 21 jours.',
    languageTitle: 'Langue',
    languageDescription:
      'Les contenus de votre sandbox sont rédigés dans cette langue. Les deux autres en sont les traductions.',
    submit: 'Créer ma sandbox',
    pending: 'Création de votre sandbox…',
    errors: {
      template: 'Cette langue n’est pas disponible.',
      turnstile: 'La vérification de sécurité a échoué. Veuillez réessayer.',
      rate_limit:
        'Vous avez déjà créé plusieurs sandboxes au cours de la dernière heure. Veuillez réessayer plus tard.',
      full: 'Toutes les sandboxes sont occupées pour le moment. Veuillez réessayer plus tard.',
      invitation: 'Cette invitation a déjà été utilisée, ou elle n’existe pas.',
      failed: 'La sandbox n’a pas pu être créée. Veuillez réessayer.',
    },
    access: {
      unknown:
        'Ce lien d’accès n’est plus valable. Veuillez en demander un nouveau à la personne qui vous l’a envoyé.',
      gone: 'La sandbox de ce lien d’accès n’existe plus.',
    },
  },
}
