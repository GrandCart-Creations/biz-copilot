/**
 * WELCOME STEP
 * 
 * First step: Welcome screen with value proposition
 */

import React from 'react';
import {
  FaChartLine,
  FaShieldAlt,
  FaUsers,
  FaRocket,
  FaCheckCircle
} from 'react-icons/fa';

const WelcomeStep = ({ onNext }) => {
  const features = [
    {
      icon: FaChartLine,
      title: 'Track Everything',
      description: 'Expenses, income, and financial insights all in one place'
    },
    {
      icon: FaShieldAlt,
      title: 'Enterprise Security',
      description: 'Your data is encrypted and protected with industry-leading security'
    },
    {
      icon: FaUsers,
      title: 'Team Collaboration',
      description: 'Invite your team and manage permissions effortlessly'
    },
    {
      icon: FaRocket,
      title: 'BENELUX Compliant',
      description: 'Built-in tax rates and compliance for BENELUX entrepreneurs'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block w-20 h-20 bg-gradient-to-r from-[#005C70] to-[#00BFA6] rounded-full flex items-center justify-center mb-4">
          <span className="text-white font-bold text-3xl">BC</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Biz-CoPilot!
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Your intelligent business management platform for BENELUX entrepreneurs
        </p>
        <p className="text-gray-500 mb-8">
          Let's get you set up in just a few simple steps. This will take about 3-5 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#8FD4C5] transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#D4F5EF] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-[#005C70]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <FaCheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">What You'll Set Up:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Your company profile and basic information
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Regional settings (currency, tax rates)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Team member invitations (optional)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Quick tour of key features
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => onNext()}
          className="px-8 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg font-semibold hover:from-[#014A5A] hover:to-[#019884] transition-all shadow-lg hover:shadow-xl"
        >
          Let's Get Started →
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;

