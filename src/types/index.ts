export type JourneyStatus = 'not_started' | 'in_progress' | 'paused' | 'completed';

export type StopStatus = 
  | 'pending' 
  | 'traveling' 
  | 'arrived' 
  | 'servicing' 
  | 'completed' 
  | 'skipped' 
  | 'cancelled';

export type EventType =
  | 'JOURNEY_START'
  | 'JOURNEY_PAUSE'
  | 'JOURNEY_RESUME'
  | 'TRAVEL_START'
  | 'TRAVEL_END'
  | 'ARRIVE'
  | 'SERVICE_START'
  | 'SERVICE_END'
  | 'RETURN_START'
  | 'RETURN_END'
  | 'JOURNEY_END'
  | 'STOP_ADDED'
  | 'STOP_REORDERED'
  | 'STOP_SKIPPED'
  | 'STOP_CANCELLED';

export interface Client {
  id: string;
  name: string;
  address: string;
  phone?: string;
  notes?: string;
  defaultServiceMinutes?: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  archivedAt?: string | null;
}

export interface JourneyStop {
  id: string;
  journeyId: string;
  clientId: string; // can be 'return_to_base' if return stop
  position: number;
  status: StopStatus;
  plannedServiceMinutes?: number;
  travelStartedAt?: string; // ISO string
  arrivedAt?: string;       // ISO string
  serviceStartedAt?: string; // ISO string
  serviceEndedAt?: string;   // ISO string
  travelEndedAt?: string;    // ISO string
  isReturnToBase?: boolean;
  notes?: string;
}

export interface JourneyEvent {
  id: string;
  journeyId: string;
  stopId?: string;
  type: EventType;
  occurredAt: string; // ISO string
  metadata?: Record<string, any>;
}

export interface Journey {
  id: string;
  date: string; // YYYY-MM-DD
  status: JourneyStatus;
  startedAt?: string; // ISO string
  endedAt?: string;   // ISO string
  createdAt: string;  // ISO string
  updatedAt: string;  // ISO string
  notes?: string;
}

export interface EnrichedStop extends JourneyStop {
  client?: Client;
}

export interface EnrichedJourney extends Journey {
  stops: EnrichedStop[];
  events: JourneyEvent[];
  stats: JourneyStats;
}

export interface JourneyStats {
  totalStops: number;
  completedStops: number;
  skippedStops: number;
  cancelledStops: number;
  totalTravelSeconds: number;
  totalServiceSeconds: number;
  totalDurationSeconds: number;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  appName: 'RotaPro';
  clients: Client[];
  journeys: Journey[];
  stops: JourneyStop[];
  events: JourneyEvent[];
}
