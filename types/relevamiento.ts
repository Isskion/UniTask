export interface Stakeholder {
  role: string;
  name: string;
  contact?: string;
}

export interface RelevamientoData {
  projectId: string;
  general: {
    companyName: string;
    activity: string;
    stakeholders: Stakeholder[];
  };
  objectives: string[];
  operational: {
    cdCount: number;
    locations: string[];
    dailyDeliveries: string;
    dailyTrips: string;
    vehicles: {
      count: string;
      types: string;
    };
    routingType: 'T1' | 'T2' | 'Both' | string;
    currentSystems: string;
  };
  planning: {
    vehicleAssociation: boolean;
    secondTrips: boolean;
    routingFrequency: string;
    constraints: string[];
    optimizationUnits: string[];
    pickupDelivery: boolean;
  };
  tracking: {
    tripGeneration: 'Manual' | 'Auto' | string;
    statusFlow: string;
    avlProviders: string;
    alarms: string;
  };
  mobile: {
    gpsEvents: boolean;
    features: string[]; // photo, sign, scan, etc.
    deviceType: 'Android' | 'WAP' | string;
  };
  technical: {
    hosting: 'On-Premise' | 'Cloud' | string;
    database: string;
    integrations: string;
  };
  status: 'Draft' | 'In Review' | 'Approved';
  progress: number;
}
