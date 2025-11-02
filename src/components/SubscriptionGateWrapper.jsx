/**
 * Subscription Gate Wrapper
 * Extracts URL params and displays SubscriptionGate component
 */

import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import SubscriptionGate from './SubscriptionGate';
import { getModule } from '../utils/modules';

const SubscriptionGateWrapper = () => {
  const { moduleId } = useParams();
  const [searchParams] = useSearchParams();
  
  const requiredTier = searchParams.get('required') || 'business';
  const currentTier = searchParams.get('current') || 'lite';
  const module = getModule(moduleId);
  const moduleName = module?.name || 'This module';

  return (
    <SubscriptionGate 
      requiredTier={requiredTier}
      currentTier={currentTier}
      moduleName={moduleName}
    />
  );
};

export default SubscriptionGateWrapper;

