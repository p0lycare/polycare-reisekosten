-- Per Routing berechnete Strecke je Fahrt; Abweichungen zu den eingetragenen km werden gekennzeichnet
alter table fahrt add column km_route numeric(7, 1) check (km_route is null or (km_route > 0 and km_route < 10000));
