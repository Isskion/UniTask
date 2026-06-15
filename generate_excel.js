const fs = require('fs');
const xlsx = require('xlsx');

const jsonInput = {
    "uniqueIdentifier": "855b1291551c11f1883f00000eb3f090",
    "createTimestamp": "2026-05-15",
    "createUserId": "Diego Moreno Gomez",
    "createUserEmail": "diego.moreno.gomez@lns.maersk.com",
    "updateTimestamp": "2026-05-15T10:48:18Z",
    "updateUserId": "Diego Moreno Gomez",
    "updateUserEmail": "diego.moreno.gomez@lns.maersk.com",
    "transactionType": "01",
    "softCodedValues": [
      {
        "attributeName": "FirstCargoReceipt",
        "value": "ESDOP"
      },
      {
        "attributeName": "LastCargoDelivery",
        "value": "ESALRTM"
      },
      {
        "attributeName": "CAD_OFFSET",
        "value": "+02:00:00"
      }
    ],
    "parties": [
      {
        "sequence": 1,
        "partyFunction": "CARRIER",
        "party": {
          "partyCode": "1137893",
          "partyName": "TRANSPAIS S. A.",
          "language": "en",
          "postalAddresses": [
            {
              "postalAddressLine1": "POL IND ARGENTERIA PARCELAS D-H",
              "countryName": "Spain",
              "houseNumber": "D-H",
              "postalCode": "43470",
              "cityName": "La Selva del Camp",
              "iso2CountryCode": "ES"
            }
          ],
          "telecommunicationNumbers": [
            {
              "telecommunicationNumber": "34 902366595",
              "telecommunicationNumberType": "Telephone"
            },
            {
              "telecommunicationNumber": "34 902366596",
              "telecommunicationNumberType": "Facsimile"
            }
          ],
          "emailAddresses": [
            "COMERCIAL@TRANSPAIS.ES"
          ]
        }
      },
      {
        "sequence": 2,
        "partyFunction": "SHIPPER",
        "party": {
          "partyCode": "ES00286196",
          "partyName": "MERTRAMAR SAU",
          "language": "en",
          "postalAddresses": [
            {
              "postalAddressLine1": "CTRA DE LA EXCLUSA POL IND ZAL",
              "countryName": "Spain",
              "houseNumber": "S/N",
              "postalCode": "41011",
              "cityName": "Sevilla",
              "iso2CountryCode": "ES"
            }
          ],
          "telecommunicationNumbers": [
            {
              "telecommunicationNumber": "34 954296320",
              "telecommunicationNumberType": "Telephone"
            }
          ]
        }
      },
      {
        "sequence": 3,
        "partyFunction": "CONSIGNEE",
        "party": {
          "partyCode": "ES00286196",
          "partyName": "MERTRAMAR SAU",
          "language": "en",
          "postalAddresses": [
            {
              "postalAddressLine1": "CTRA DE LA EXCLUSA POL IND ZAL",
              "countryName": "Spain",
              "houseNumber": "S/N",
              "postalCode": "41011",
              "cityName": "Sevilla",
              "iso2CountryCode": "ES"
            }
          ],
          "telecommunicationNumbers": [
            {
              "telecommunicationNumber": "34 954296320",
              "telecommunicationNumberType": "Telephone"
            }
          ]
        }
      },
      {
        "sequence": 4,
        "partyFunction": "BOOKED_BY",
        "party": {
          "partyCode": "ES00286196",
          "partyName": "MERTRAMAR SAU",
          "partyRoles": [
            "Z8"
          ]
        }
      },
      {
        "sequence": 5,
        "partyFunction": "CUSTOMER",
        "party": {
          "partyCode": "1001479709",
          "partyName": "MERTRAMAR SAU",
          "language": "en",
          "partyRoles": [
            "1"
          ],
          "postalAddresses": [
            {
              "postalAddressLine1": "CTRA DE LA EXCLUSA POL IND ZAL",
              "countryName": "Spain",
              "houseNumber": "S/N",
              "postalCode": "41011",
              "cityName": "Sevilla",
              "iso2CountryCode": "ES"
            }
          ]
        }
      },
      {
        "sequence": 6,
        "partyFunction": "NOTIFY_PARTY",
        "party": {
          "partyCode": "Notify Party",
          "partyName": "MAERSK",
          "partyRoles": [
            "ZN"
          ],
          "telecommunicationNumbers": [
            {
              "telecommunicationNumber": "888-769-6124",
              "telecommunicationNumberType": "Facsimile"
            }
          ]
        }
      },
      {
        "sequence": 7,
        "partyFunction": "ORDERING_PARTY",
        "party": {
          "partyCode": "1003140629",
          "partyName": "FWH-ES40",
          "postalAddresses": [
            {
              "countryName": "Spain",
              "cityName": "Pozuelo de Alarcón, Madri",
              "iso2CountryCode": "ES"
            }
          ]
        }
      },
      {
        "sequence": 8,
        "partyFunction": "ContactAtCustomerLocation",
        "party": {
          "partyCode": "1003140593",
          "partyName": "MANUEL ANDRADE",
          "partyRoles": [
            "TM026"
          ],
          "postalAddresses": [
            {
              "iso2CountryCode": "ES"
            }
          ],
          "telecommunicationNumbers": [
            {
              "telecommunicationNumber": "954296320",
              "telecommunicationNumberType": "Telephone"
            }
          ],
          "emailAddresses": [
            "trafico@mertramar.com"
          ]
        }
      },
      {
        "sequence": 9,
        "partyFunction": "AdditionalNotifyParty",
        "party": {
          "partyCode": "1003541669",
          "partyName": "PORTEL SYSTEM",
          "language": "en",
          "partyRoles": [
            "TM001"
          ],
          "postalAddresses": [
            {
              "postalAddressLine1": "Portel System",
              "countryName": "Spain",
              "postalCode": "28821",
              "cityName": "Madrid",
              "iso2CountryCode": "ES"
            }
          ]
        }
      }
    ],
    "workProcesses": [
      {
        "workProcessStartDatetime": "2026-05-18T02:53:52Z",
        "workProcessEndDatetime": "2026-05-18T09:08:08Z",
        "workProcessSpecification": [
          {
            "uniqueIdentifier": "SD",
            "workProcessSpecificationName": "SD_IND"
          },
          {
            "uniqueIdentifier": "PP",
            "workProcessSpecificationName": "FreightTerms"
          },
          {
            "uniqueIdentifier": "CONTRACTED",
            "workProcessSpecificationName": "VendorPreference"
          }
        ],
        "workProcessStatus": [
          {
            "workProcessStatusCode": "02",
            "workProcessStatusName": "LifeCycleStatus"
          },
          {
            "workProcessStatusCode": "01",
            "workProcessStatusName": "ConfirmationStatus"
          },
          {
            "workProcessStatusCode": "02",
            "workProcessStatusName": "ExecutionStatus"
          },
          {
            "workProcessStatusCode": "01",
            "workProcessStatusName": "FreightOrderInvoicingStatus"
          },
          {
            "workProcessStatusCode": "01",
            "workProcessStatusName": "CarrierInvoicingStatus"
          },
          {
            "workProcessStatusCode": "false",
            "workProcessStatusName": "MultipleInvoicingCarrier"
          },
          {
            "workProcessStatusCode": "False",
            "workProcessStatusName": "InvoicingVendorIndicator"
          },
          {
            "workProcessStatusCode": "False",
            "workProcessStatusName": "UrgentIndicator"
          }
        ],
        "transportActivity": "Export"
      }
    ],
    "internalVersionNumber": "1003507024-0001",
    "issuedDatetime": "2026-05-15T10:48:22Z",
    "carrierBookingNumber": "67009718913",
    "carrierBookingType": "ROT",
    "cargoDescription": "Soap",
    "totalBookedGrossWeight": 29180,
    "totalBookedGrossWeightUnit": "KGM",
    "totalBookedNetWeight": 24400,
    "totalBookedNetWeightUnit": "KGM",
    "totalBookedItemQuantity": 1,
    "totalBookedItemQuantityUnit": "PCE",
    "deadlines": [
      {
        "timestamp": "2026-05-07T13:00:00Z",
        "deadlineCode": "+02:00:00",
        "deadlineName": "EARLIEST_DROPOFF"
      },
      {
        "timestamp": "2026-05-21T13:00:00Z",
        "deadlineCode": "+02:00:00",
        "deadlineName": "VESSEL_CUTOFF"
      }
    ],
    "transportPlan": {
      "transportMode": "TRK",
      "locations": [
        {
          "locationFunction": "PLACE_OF_RECEIPT",
          "location": {
            "postalAddresses": [
              {
                "cityName": "Dos Hermanas",
                "iso2CountryCode": "ES"
              }
            ]
          }
        },
        {
          "locationFunction": "PLACE_OF_DELIVERY",
          "location": {
            "postalAddresses": [
              {
                "cityName": "London Gateway",
                "iso2CountryCode": "GB"
              }
            ]
          }
        }
      ],
      "route": {
        "routePoint": [
          {
            "sequence": 1,
            "equipmentNumber": "47013289448",
            "transportMode": "TRK",
            "transportActivity": "01",
            "latestTimeOfDeparture": "2026-05-18T02:53:52Z",
            "earliestTimeOfArrival": "2026-05-18T02:53:52Z",
            "timestamp": "+02:00:00",
            "locations": {
              "locationFunction": "Route_Point",
              "location": {
                "facilityCode": "ESALR03",
                "facilityName": "STAR CONTAINER DEPOT - COMESA",
                "facilityType": "ZOPS",
                "uniqueIdentifier": "-/000D3A46AA761FE194896CB6DF8C7668",
                "postalAddresses": [
                  {
                    "postalAddressLine1": "Pol. Ind. Cortijo Real",
                    "postalAddressLine2": "Parcela J4-J5",
                    "postalAddressLine3": "Algeciras",
                    "countryName": "Spain",
                    "postalCode": "11206",
                    "cityName": "Algeciras",
                    "iso2CountryCode": "ES"
                  }
                ]
              }
            }
          },
          {
            "sequence": 2,
            "equipmentNumber": "47013289448",
            "transportMode": "TRK",
            "transportActivity": "05",
            "latestTimeOfDeparture": "2026-05-18T05:01:00Z",
            "earliestTimeOfArrival": "2026-05-18T05:01:00Z",
            "timestamp": "+02:00:00",
            "locations": {
              "locationFunction": "Route_Point",
              "location": {
                "facilityCode": "12701184574",
                "facilityName": "TRAINLOGIST (PLATAFORMA LOGISTICA)",
                "facilityType": "Z021",
                "uniqueIdentifier": "000D3A46AA761FE194896CB6DF8C9668/000D3AAB48271FD194896CC8C77ADB6D",
                "postalAddresses": [
                  {
                    "postalAddressLine1": "CALLE ACUEDUCTO",
                    "countryName": "Spain",
                    "houseNumber": "52",
                    "postalCode": "41703",
                    "cityName": "Dos Hermanas",
                    "iso2CountryCode": "ES"
                  }
                ]
              }
            }
          },
          {
            "sequence": 3,
            "equipmentNumber": "47013289448",
            "transportActivity": "04",
            "latestTimeOfDeparture": "2026-05-18T09:08:08Z",
            "earliestTimeOfArrival": "2026-05-18T09:08:08Z",
            "timestamp": "+02:00:00",
            "locations": {
              "locationFunction": "Route_Point",
              "location": {
                "facilityCode": "ESALRTM",
                "facilityName": "Algeciras - ML Terminal",
                "facilityType": "ZOPS",
                "uniqueIdentifier": "000D3AAB48271FD194896CC8C77AFB6D/-",
                "postalAddresses": [
                  {
                    "postalAddressLine1": "Muelle Juan Carlos I S/N",
                    "countryName": "Spain",
                    "postalCode": "11201",
                    "cityName": "Algeciras",
                    "iso2CountryCode": "ES"
                  }
                ]
              }
            }
          }
        ]
      },
      "transportLegs": [
        {
          "sequence": 1,
          "transportLegIdentifier": "10",
          "isEmptyEquipmentTransport": true,
          "earliestTimeOfDeparture": "2026-05-18T02:53:52Z",
          "estimatedTimeOfDeparture": "2026-05-18T02:53:52Z",
          "latestTimeOfDeparture": "2026-05-18T02:53:52Z",
          "earliestTimeOfArrival": "2026-05-18T05:01:00Z",
          "estimatedTimeOfArrival": "2026-05-18T05:01:00Z",
          "latestTimeOfArrival": "2026-05-18T05:01:00Z",
          "estimatedTransitTime": "PT2H7M8S",
          "startLocation": [
            {
              "locationFunction": "LOADING_LOCATION",
              "location": {
                "businessIdentifier": "ESALR03",
                "facilityName": "STAR CONTAINER DEPOT - COMESA",
                "facilityType": "ZOPS",
                "validToDatetime": "+02:00:00",
                "uniqueIdentifier": "000D3A46AA761FE194896CB6DF8C7668",
                "postalAddresses": [
                  {
                    "postalAddressLine1": "Pol. Ind. Cortijo Real",
                    "postalAddressLine2": "Parcela J4-J5",
                    "postalAddressLine3": "Algeciras",
                    "countryName": "Spain",
                    "postalCode": "11206",
                    "cityName": "Algeciras",
                    "iso2CountryCode": "ES"
                  }
                ]
              }
            }
          ],
          "endLocation": [
            {
              "locationFunction": "UNLOADING_LOCATION",
              "location": {
                "businessIdentifier": "12701184574",
                "facilityName": "TRAINLOGIST (PLATAFORMA LOGISTICA)",
                "facilityType": "Z021",
                "validToDatetime": "+02:00:00",
                "uniqueIdentifier": "000D3A46AA761FE194896CB6DF8C9668",
                "postalAddresses": [
                  {
                    "postalAddressLine1": "CALLE ACUEDUCTO",
                    "countryName": "Spain",
                    "houseNumber": "52",
                    "postalCode": "41703",
                    "cityName": "Dos Hermanas",
                    "iso2CountryCode": "ES"
                  }
                ]
              }
            }
          ],
          "transportMode": "TRK",
          "carriage": {
            "carriageType": "ROAD"
          },
          "softCodedValues": [
            {
              "sequence": 1,
              "attributeName": "GateOutContainerStatus",
              "value": "EP"
            }
          ],
          "cargoStuffing": [
            {
              "cargoStuffingNumber": "47013289805"
            }
          ]
        },
        {
          "sequence": 2,
          "transportLegIdentifier": "20",
          "isEmptyEquipmentTransport": false,
          "earliestTimeOfDeparture": "2026-05-18T05:01:00Z",
          "estimatedTimeOfDeparture": "2026-05-18T05:01:00Z",
          "latestTimeOfDeparture": "2026-05-18T07:01:00Z",
          "earliestTimeOfArrival": "2026-05-18T09:08:08Z",
          "estimatedTimeOfArrival": "2026-05-18T09:08:08Z",
          "latestTimeOfArrival": "2026-05-18T09:08:08Z",
          "estimatedTransitTime": "PT2H7M8S",
          "startLocation": [
            {
              "locationFunction": "LOADING_LOCATION",
              "location": {
                "businessIdentifier": "12701184574",
                "facilityName": "TRAINLOGIST (PLATAFORMA LOGISTICA)",
                "facilityType": "Z021",
                "validToDatetime": "+02:00:00",
                "uniqueIdentifier": "000D3AAB48271FD194896CC8C77ADB6D",
                "postalAddresses": [
                  {
                    "postalAddressLine1": "CALLE ACUEDUCTO",
                    "countryName": "Spain",
                    "houseNumber": "52",
                    "postalCode": "41703",
                    "cityName": "Dos Hermanas",
                    "iso2CountryCode": "ES"
                  }
                ]
              }
            }
          ],
          "endLocation": [
            {
              "locationFunction": "UNLOADING_LOCATION",
              "location": {
                "businessIdentifier": "ESALRTM",
                "facilityName": "Algeciras - ML Terminal",
                "facilityType": "ZOPS",
                "validToDatetime": "+02:00:00",
                "uniqueIdentifier": "000D3AAB48271FD194896CC8C77AFB6D",
                "postalAddresses": [
                  {
                    "postalAddressLine1": "Muelle Juan Carlos I S/N",
                    "countryName": "Spain",
                    "postalCode": "11201",
                    "cityName": "Algeciras",
                    "iso2CountryCode": "ES"
                  }
                ]
              }
            }
          ],
          "transportMode": "TRK",
          "carriage": {
            "carriageType": "ROAD"
          },
          "relatedCarriage": {
            "carriageType": "Ocean",
            "vesselPortCallStart": {
              "estimatedTimeOfDeparture": "2026-05-22T00:00:00Z",
              "departureVoyageNumber": "616N",
              "predictedTimeOfDeparture": "+02:00:00",
              "port": [
                {
                  "portName": "ESALR - Algeciras - ML Terminal",
                  "portCode": "ESALRTM",
                  "portIdentifier": "PortOfLoading"
                },
                {
                  "portName": "GBLGP - London Gateway Terminal",
                  "portCode": "GBLGPTM",
                  "portIdentifier": "NextPort"
                }
              ],
              "deadlineOccurances": [
                {
                  "timestamp": "2026-05-21T13:00:00Z",
                  "deadlineCode": "+02:00:00",
                  "deadlineName": "VESSEL_CUTOFF"
                },
                {
                  "timestamp": "2026-05-07T13:00:00Z",
                  "deadlineCode": "+02:00:00",
                  "deadlineName": "EARLIEST_DROPOFF"
                }
              ]
            },
            "vesselPortCallEnd": {
              "port": [
                {
                  "portName": "GBLGP - London Gateway Terminal",
                  "portCode": "GBLGPTM",
                  "portIdentifier": "PortOfDischarge"
                }
              ]
            },
            "vessel": {
              "vesselMaerskCode": "KFC",
              "vesselName": "ONE RESPONSIBILITY"
            }
          },
          "softCodedValues": [
            {
              "sequence": 1,
              "attributeName": "GateOutContainerStatus",
              "value": "FP"
            }
          ],
          "cargoStuffing": [
            {
              "cargoStuffingNumber": "47013289448"
            }
          ]
        }
      ],
      "transportOrder": {
        "cargoStuffing": [
          {
            "bookingNumber": "270501693",
            "journeyType": "Export",
            "cargoStuffingNumber": "47013289448",
            "isEmptyEquipment": false,
            "totalPlannedStuffedGrossWeight": 29180,
            "totalPlannedStuffedNetWeight": 24400,
            "weightUnit": "KGM",
            "commodityCodes": [
              {
                "commoditySystemCode": "MK",
                "commodityCode": "002908",
                "commodityName": "Soap"
              }
            ],
            "cargoType": {
              "cargoTypeCode": "CG",
              "cargoTypeName": "4611110 - FREIGHT ALL KINDS, ("
            },
            "equipment": {
              "equipmentSizeType": {
                "equipmentType": {
                  "equipmentTypeCode": "45DRY96",
                  "equipmentTypeName": "45 DRY 9' 6\"",
                  "equipmentTypeParent": [
                    "45D"
                  ]
                },
                "equipmentSize": {
                  "equipmentSizeCode": "45"
                },
                "equipmentHeight": {
                  "equipmentHeightCode": "9 6"
                },
                "isoSizeTypeCode": "L5G1",
                "isShipperOwnedContainerAccepted": false,
                "equipmentProfile": {
                  "equipmentProfileType": {
                    "equipmentProfileTypeName": "DRY"
                  },
                  "cubicCapacity": 86,
                  "cubicCapacityUnit": "M3",
                  "tareWeight": 4780,
                  "tareWeightUnit": "KGM"
                },
                "isDefault": true
              },
              "asset": {
                "assetIdentifier": "NA1Q1IT5O3YJB"
              }
            },
            "transportAssetRequirements": {
              "requiredEquipmentSizeTypeCode": "45DRY96",
              "transportAssetQuantity": 1,
              "isRefrigeratedAsset": false,
              "isNonOperatingRefrigiratedAsset": true,
              "fumigation": {
                "fumigationIdentifier": "false"
              }
            },
            "parties": [
              {
                "sequence": 1,
                "partyFunction": "SHIPPER",
                "party": {
                  "partyCode": "ES00286196",
                  "partyName": "MERTRAMAR SAU",
                  "language": "en",
                  "postalAddresses": [
                    {
                      "postalAddressLine1": "CTRA DE LA EXCLUSA POL IND ZAL",
                      "countryName": "Spain",
                      "houseNumber": "S/N",
                      "postalCode": "41011",
                      "cityName": "Sevilla",
                      "iso2CountryCode": "ES"
                    }
                  ],
                  "telecommunicationNumbers": [
                    {
                      "telecommunicationNumber": "34 954296320",
                      "telecommunicationNumberType": "Telephone"
                    }
                  ],
                  "alternativeCodes": [
                    {
                      "alternativeCode": "ES00286196",
                      "alternativeCodeName": "Maersk_SMDS_Code"
                    }
                  ]
                }
              },
              {
                "sequence": 2,
                "partyFunction": "CONSIGNEE",
                "party": {
                  "partyCode": "ES00286196",
                  "partyName": "MERTRAMAR SAU",
                  "language": "en",
                  "postalAddresses": [
                    {
                      "postalAddressLine1": "CTRA DE LA EXCLUSA POL IND ZAL",
                      "countryName": "Spain",
                      "houseNumber": "S/N",
                      "postalCode": "41011",
                      "cityName": "Sevilla",
                      "iso2CountryCode": "ES"
                    }
                  ],
                  "telecommunicationNumbers": [
                    {
                      "telecommunicationNumber": "34 954296320",
                      "telecommunicationNumberType": "Telephone"
                    }
                  ],
                  "alternativeCodes": [
                    {
                      "alternativeCode": "ES00286196",
                      "alternativeCodeName": "Maersk_SMDS_Code"
                    }
                  ]
                }
              },
              {
                "sequence": 3,
                "partyFunction": "BOOKED_BY",
                "party": {
                  "partyCode": "ES00286196",
                  "partyName": "MERTRAMAR SAU",
                  "partyRoles": [
                    "Z8"
                  ],
                  "alternativeCodes": [
                    {
                      "alternativeCode": "ES00286196",
                      "alternativeCodeName": "Maersk_SMDS_Code"
                    }
                  ]
                }
              },
              {
                "sequence": 4,
                "partyFunction": "CUSTOMER",
                "party": {
                  "partyCode": "ES00286196",
                  "partyName": "MERTRAMAR SAU",
                  "partyRoles": [
                    "SP"
                  ],
                  "alternativeCodes": [
                    {
                      "alternativeCode": "ES00286196",
                      "alternativeCodeName": "Maersk_SMDS_Code"
                    }
                  ]
                }
              },
              {
                "sequence": 5,
                "partyFunction": "OCEAN_CARRIER",
                "party": {
                  "partyCode": "MAEU",
                  "partyName": "Maersk A/S",
                  "partyRoles": [
                    "ZO"
                  ],
                  "alternativeCodes": [
                    {
                      "alternativeCode": "5076",
                      "alternativeCodeName": "Maersk_SMDS_Code"
                    }
                  ]
                }
              }
            ],
            "instructions": [
              {
                "sequence": 1,
                "text": "||",
                "instructionType": {
                  "instructionTypeCode": "ZHLG",
                  "instructionTypeName": "Haulage Instructions"
                }
              }
            ],
            "references": [
              {
                "reference": "9ONPAAQWO3M3B",
                "referenceTypeCode": "ZPRV",
                "referenceTypeName": "GCSS Previous Equipment ID"
              },
              {
                "reference": "1",
                "referenceTypeCode": "ZEQUS",
                "referenceTypeName": "Equipment Sequence Number"
              },
              {
                "reference": "270501693",
                "referenceTypeCode": "ZIMP",
                "referenceTypeName": "Original Booking Number (ImportShip)"
              },
              {
                "reference": "1030508",
                "referenceTypeCode": "ZCREF",
                "referenceTypeName": "Customer Reference Number"
              },
              {
                "reference": "NA1Q1IT5O3YJB",
                "referenceTypeCode": "ZEQUI",
                "referenceTypeName": "Equipment ID"
              },
              {
                "reference": "270501693",
                "referenceTypeCode": "ZGCSS",
                "referenceTypeName": "Booking Reference Number"
              },
              {
                "referenceIdentifier": "1",
                "reference": "270501693",
                "referenceTypeCode": "ZBL",
                "referenceTypeName": "Bill of Lading number"
              },
              {
                "reference": "SD/CY",
                "referenceTypeCode": "ZUMOD",
                "referenceTypeName": "Service mode"
              },
              {
                "reference": "270501693",
                "referenceTypeCode": "ZFOWN",
                "referenceTypeName": "FWO Owner Document"
              },
              {
                "reference": "CARRIER",
                "referenceTypeCode": "ZRESP",
                "referenceTypeName": "Haulage Arranged by"
              },
              {
                "reference": "APC052",
                "referenceTypeCode": "ZUSER",
                "referenceTypeName": "SendByUserId"
              },
              {
                "reference": "MAEU",
                "referenceTypeCode": "ZBRND",
                "referenceTypeName": "Brand name"
              },
              {
                "reference": "1",
                "referenceTypeCode": "ZVERS",
                "referenceTypeName": "Haulage Version Number"
              },
              {
                "referenceIdentifier": "60",
                "reference": "GCSS_251091062",
                "referenceTypeCode": "ZHAUL",
                "referenceTypeName": "Haulage Order"
              },
              {
                "referenceIdentifier": "60",
                "reference": "7003623663",
                "referenceTypeCode": "1123",
                "referenceTypeName": "Transportation Request"
              }
            ],
            "cargoStuffingLines": [
              {
                "cargoStuffingNumber": "1",
                "actualStuffedPackageQuantity": 1,
                "packageWeight": 24400,
                "weightUnit": "KGM"
              }
            ]
          },
          {
            "bookingNumber": "270501693",
            "journeyType": "Export",
            "cargoStuffingNumber": "47013289805",
            "isEmptyEquipment": true,
            "totalPlannedStuffedGrossWeight": 4780,
            "weightUnit": "KGM",
            "cargoType": {
              "cargoTypeCode": "CG",
              "cargoTypeName": "4611110 - FREIGHT ALL KINDS, ("
            },
            "equipment": {
              "equipmentSizeType": {
                "equipmentType": {
                  "equipmentTypeCode": "45DRY96",
                  "equipmentTypeName": "45 DRY 9' 6\"",
                  "equipmentTypeParent": [
                    "45D"
                  ]
                },
                "equipmentSize": {
                  "equipmentSizeCode": "45"
                },
                "equipmentHeight": {
                  "equipmentHeightCode": "9 6"
                },
                "isoSizeTypeCode": "L5G1",
                "isShipperOwnedContainerAccepted": false,
                "equipmentProfile": {
                  "equipmentProfileType": {
                    "equipmentProfileTypeName": "DRY"
                  },
                  "cubicCapacity": 86,
                  "cubicCapacityUnit": "M3",
                  "tareWeight": 4780,
                  "tareWeightUnit": "KGM"
                },
                "isDefault": false
              },
              "asset": {
                "assetIdentifier": "NA1Q1IT5O3YJB"
              }
            },
            "transportAssetRequirements": {
              "requiredEquipmentSizeTypeCode": "45DRY96",
              "transportAssetQuantity": 1,
              "isRefrigeratedAsset": false,
              "isNonOperatingRefrigiratedAsset": true,
              "fumigation": {
                "fumigationIdentifier": "false"
              }
            }
          }
        ]
      }
    },
    "rate": {
      "rateNumber": "2026-05-18T05:01:00Z",
      "totalAmount": 420.9,
      "isoCurrencyCode": "EUR",
      "rateLines": [
        {
          "rateLineNumber": "000D3A46A7A91FD19489713CC995B9A1",
          "rateStatus": "Active",
          "amount": 0,
          "isoCurrencyCode": "EUR",
          "externalDescription": "Z071",
          "chargeType": {
            "chargeTypeCode": "ZTRUCK_INT_FUEL",
            "chargeTypeDescription": "Intermodal Fuel Surcharge Truck"
          },
          "approvals": {
            "approvalNote": 0,
            "approvalStatus": {
              "approvalStatusName": "No Approval Required"
            }
          }
        },
        {
          "rateLineNumber": "000D3A46A7A91FD19489713CC995F9A1",
          "rateStatus": "Active",
          "amount": 75.9,
          "isoCurrencyCode": "EUR",
          "externalDescription": "Z124",
          "chargeType": {
            "chargeTypeCode": "ZOVERWT_AUTO",
            "chargeTypeDescription": "Auto Overweight Charge"
          },
          "reference": "37426392",
          "approvals": {
            "approvalNote": 75.9,
            "approvalStatus": {
              "approvalStatusName": "No Approval Required"
            }
          }
        },
        {
          "rateLineNumber": "000D3A46A7A91FD19489713CC99139A1",
          "rateStatus": "Active",
          "amount": 345,
          "isoCurrencyCode": "EUR",
          "externalDescription": "Z004",
          "chargeType": {
            "chargeTypeCode": "ZBASE_TRUCK",
            "chargeTypeDescription": "Trucking"
          },
          "reference": "38281403",
          "approvals": {
            "approvalNote": 345,
            "approvalStatus": {
              "approvalStatusName": "No Approval Required"
            }
          }
        },
        {
          "rateLineNumber": "000D3A46A7A91FD19489713CC99079A1",
          "rateStatus": "Inactive",
          "chargeType": {
            "chargeTypeCode": "ZRELOAD",
            "chargeTypeDescription": "Triangulation Fees"
          },
          "approvals": {
            "approvalNote": 0,
            "approvalStatus": {
              "approvalStatusName": "Rejected"
            }
          }
        },
        {
          "rateLineNumber": "000D3A46A7A91FD19489713CC99179A1",
          "rateStatus": "Inactive",
          "externalDescription": "Z004",
          "chargeType": {
            "chargeTypeCode": "ZBASE_TRUCK",
            "chargeTypeDescription": "Trucking"
          },
          "approvals": {
            "approvalStatus": {
              "approvalStatusName": "Rejected"
            }
          }
        },
        {
          "rateLineNumber": "000D3A46A7A91FD19489713CC99639A1",
          "rateStatus": "Inactive",
          "chargeType": {
            "chargeTypeCode": "ZGENSET_REEFER",
            "chargeTypeDescription": "Genset Hire"
          },
          "approvals": {
            "approvalNote": 0,
            "approvalStatus": {
              "approvalStatusName": "Rejected"
            }
          }
        },
        {
          "rateLineNumber": "000D3A46A7A91FD19489713CC99879A1",
          "rateStatus": "Inactive",
          "chargeType": {
            "chargeTypeCode": "ZRELOAD_FIX",
            "chargeTypeDescription": "Triangulation Fixed Fee"
          },
          "approvals": {
            "approvalNote": 0,
            "approvalStatus": {
              "approvalStatusName": "Rejected"
            }
          }
        }
      ]
    }
};

// Map JSON to the columns
const techData = {
    "ReferenciaExterna": jsonInput.carrierBookingNumber,
    "ReferenciaAdicional": "270501693", // bookingNumber from cargoStuffing
    "IdClienteOrden": 1001479709, // MERTRAMAR SAU code
    "Observaciones": "Creación desde JSON Maersk - Soap cargo transport",
    "IdDepositoSalida": "ESALR03",
    "IdDomicilioOrden": "ESALRTM",
    "FechaRecoleccion": "2026-05-18T02:53:52",
    "FechaEntrega": "2026-05-18T09:08:08",
    "Varchar2": "NA1Q1IT5O3YJB", // Nº de Contenedor
    "IdTipoVehiculo": 0,
    "IdTipoCarga": "45DRY96", // Size Type
    "Varchar1": "420.90", // Precio
    "Peso": 29180,
    "Volumen": 86,
    "Bultos": 1,
    "Pallets": 0,
    "Varchar9": "Maersk",
    "Varchar10": "CLIENTE",
    "Varchar11": "NO"
};

const friendlyData = {
    "Nº de Referencia": jsonInput.carrierBookingNumber,
    "Nº de Booking": "270501693",
    "Cliente": "MERTRAMAR SAU (1001479709)",
    "Observaciones": "Creación desde JSON Maersk - Soap cargo transport",
    "Origen": "STAR CONTAINER DEPOT - COMESA (ESALR03)",
    "Destino": "Algeciras - ML Terminal (ESALRTM)",
    "Fecha Recolección": "2026-05-18 02:53:52",
    "Fecha Entrega": "2026-05-18 09:08:08",
    "Nº de Contenedor": "NA1Q1IT5O3YJB",
    "Tipo Vehículo": "Standard",
    "Tipo Contenedor": "45 DRY 9' 6\" (45DRY96)",
    "Precio": "420.90 EUR",
    "Peso": 29180,
    "Volumen": 86,
    "Bultos": 1,
    "Pallets": 0,
    "Sistema Origen": "Maersk",
    "Origen Dato": "CLIENTE",
    "Posicionamiento": "NO"
};

const mappingDocs = [
    { "Dato Transpais": "Nº de Referencia", "Campo UNIGIS": "ReferenciaExterna", "Valor del JSON": jsonInput.carrierBookingNumber, "Ruta en el JSON": "carrierBookingNumber" },
    { "Dato Transpais": "Nº de Booking", "Campo UNIGIS": "ReferenciaAdicional", "Valor del JSON": "270501693", "Ruta en el JSON": "transportPlan.route.routePoint[0].bookingNumber" },
    { "Dato Transpais": "Cliente", "Campo UNIGIS": "IdClienteOrden", "Valor del JSON": "1001479709", "Ruta en el JSON": "parties.CUSTOMER.partyCode" },
    { "Dato Transpais": "Observaciones", "Campo UNIGIS": "Observaciones", "Valor del JSON": "Soap cargo transport", "Ruta en el JSON": "cargoDescription" },
    { "Dato Transpais": "Origen", "Campo UNIGIS": "IdDepositoSalida", "Valor del JSON": "ESALR03", "Ruta en el JSON": "transportPlan.route.routePoint[0].locations.facilityCode" },
    { "Dato Transpais": "Destino", "Campo UNIGIS": "IdDomicilioOrden", "Valor del JSON": "ESALRTM", "Ruta en el JSON": "transportPlan.route.routePoint[2].locations.facilityCode" },
    { "Dato Transpais": "Fecha Recolección", "Campo UNIGIS": "FechaRecoleccion", "Valor del JSON": "2026-05-18T02:53:52Z", "Ruta en el JSON": "workProcesses[0].workProcessStartDatetime" },
    { "Dato Transpais": "Fecha Entrega", "Campo UNIGIS": "FechaEntrega", "Valor del JSON": "2026-05-18T09:08:08Z", "Ruta en el JSON": "workProcesses[0].workProcessEndDatetime" },
    { "Dato Transpais": "Nº de Contenedor", "Campo UNIGIS": "Varchar2", "Valor del JSON": "NA1Q1IT5O3YJB", "Ruta en el JSON": "transportOrder.cargoStuffing[0].equipment.asset.assetIdentifier" },
    { "Dato Transpais": "Tipo Vehículo", "Campo UNIGIS": "IdTipoVehiculo", "Valor del JSON": "0", "Ruta en el JSON": "Valor por defecto" },
    { "Dato Transpais": "Tipo Contenedor", "Campo UNIGIS": "IdTipoCarga", "Valor del JSON": "45DRY96", "Ruta en el JSON": "transportOrder.cargoStuffing[0].equipment.equipmentSizeType.equipmentTypeCode" },
    { "Dato Transpais": "Precio", "Campo UNIGIS": "Varchar1", "Valor del JSON": "420.9", "Ruta en el JSON": "rate.totalAmount" },
    { "Dato Transpais": "Peso", "Campo UNIGIS": "Peso", "Valor del JSON": "29180", "Ruta en el JSON": "totalBookedGrossWeight" },
    { "Dato Transpais": "Volumen", "Campo UNIGIS": "Volumen", "Valor del JSON": "86", "Ruta en el JSON": "transportOrder.cargoStuffing[0].equipment.equipmentSizeType.equipmentProfile.cubicCapacity" },
    { "Dato Transpais": "Bultos", "Campo UNIGIS": "Bultos", "Valor del JSON": "1", "Ruta en el JSON": "totalBookedItemQuantity" },
    { "Dato Transpais": "Pallets", "Campo UNIGIS": "Pallets", "Valor del JSON": "0", "Ruta en el JSON": "Valor por defecto" },
    { "Dato Transpais": "Sistema Origen", "Campo UNIGIS": "Varchar9", "Valor del JSON": "Maersk", "Ruta en el JSON": "Constante de integración" },
    { "Dato Transpais": "Origen Dato", "Campo UNIGIS": "Varchar10", "Valor del JSON": "CLIENTE", "Ruta en el JSON": "Constante de integración" },
    { "Dato Transpais": "Posicionamiento", "Campo UNIGIS": "Varchar11", "Valor del JSON": "NO", "Ruta en el JSON": "Constante de integración" }
];

const wb = xlsx.utils.book_new();

// Create sheet 1: Datos de Integracion
const ws1 = xlsx.utils.json_to_sheet([techData]);
xlsx.utils.book_append_sheet(wb, ws1, 'Datos de Integracion');

// Create sheet 2: Datos Transpais
const ws2 = xlsx.utils.json_to_sheet([friendlyData]);
xlsx.utils.book_append_sheet(wb, ws2, 'Datos Transpais');

// Create sheet 3: Especificaciones de Mapeo
const ws3 = xlsx.utils.json_to_sheet(mappingDocs);
xlsx.utils.book_append_sheet(wb, ws3, 'Especificaciones de Mapeo');

// Save workbook
xlsx.writeFile(wb, 'maersk_order.xlsx');

// Also save CSV of integration data
const csvData = xlsx.utils.sheet_to_csv(ws1);
fs.writeFileSync('maersk_order.csv', csvData, 'utf8');

console.log("Successfully generated maersk_order.xlsx and maersk_order.csv!");
