import { Request } from "express";
import { IUser } from "../models/user.model";


// Auth Request with user attached
export interface IAuthRequest extends Request {
  user?: IUser;
  token?: string;
}

// API Response Types
export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: IPagination
  token?: string;
  user?: Partial<IUser>;
  [x: string]: any
}
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: number;
  previousPage: number;
}

// JWT Payload
export interface JwtPayload {
  _id: string;
}

// Hubtel Payment Request
export interface HubtelPaymentRequest {
  CustomerName: string;
  CustomerMsisdn: string;
  Channel: string;
  Amount: number;
  PrimaryCallbackUrl: string;
  SecondaryCallbackUrl: string;
  Description: string;
  ClientReference: string;
}

// Hubtel Payment Response
export interface HubtelPaymentResponse {
  ResponseCode: string;
  Status: string;
  TransactionId: string;
  Data: any;
}

 
 