
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "app_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"device_tokens": {
                  Row: {
                    "created_at": string,"expo_push_token": string,"id": string,"last_seen_at": string,"platform": Database["public"]['Enums']["device_platform"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"expo_push_token": string,"id"?: string,"last_seen_at"?: string,"platform": Database["public"]['Enums']["device_platform"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"expo_push_token"?: string,"id"?: string,"last_seen_at"?: string,"platform"?: Database["public"]['Enums']["device_platform"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "device_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fact_check_claims": {
                  Row: {
                    "claim_text": string,"created_at": string,"explanation": string | null,"fact_check_id": string,"id": string,"is_government_related": boolean,"position": number,"verdict": Database["public"]['Enums']["fc_verdict"] | null
                  }
                  Insert: {
                    "claim_text": string,"created_at"?: string,"explanation"?: string | null,"fact_check_id": string,"id"?: string,"is_government_related"?: boolean,"position"?: number,"verdict"?: Database["public"]['Enums']["fc_verdict"] | null
                  }
                  Update: {
                    "claim_text"?: string,"created_at"?: string,"explanation"?: string | null,"fact_check_id"?: string,"id"?: string,"is_government_related"?: boolean,"position"?: number,"verdict"?: Database["public"]['Enums']["fc_verdict"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_check_claims_fact_check_id_fkey"
      columns: ["fact_check_id"]
isOneToOne: false
      referencedRelation: "fact_checks"
      referencedColumns: ["id"]
    }
                  ]
                },"fact_check_sources": {
                  Row: {
                    "claim_id": string,"created_at": string,"domain": string,"id": string,"is_existing_fact_check": boolean,"published_at": string | null,"publisher": string | null,"rating": string | null,"stance": string | null,"tier": Database["public"]['Enums']["source_tier"],"title": string | null,"url": string
                  }
                  Insert: {
                    "claim_id": string,"created_at"?: string,"domain": string,"id"?: string,"is_existing_fact_check"?: boolean,"published_at"?: string | null,"publisher"?: string | null,"rating"?: string | null,"stance"?: string | null,"tier"?: Database["public"]['Enums']["source_tier"],"title"?: string | null,"url": string
                  }
                  Update: {
                    "claim_id"?: string,"created_at"?: string,"domain"?: string,"id"?: string,"is_existing_fact_check"?: boolean,"published_at"?: string | null,"publisher"?: string | null,"rating"?: string | null,"stance"?: string | null,"tier"?: Database["public"]['Enums']["source_tier"],"title"?: string | null,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_check_sources_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "fact_check_claims"
      referencedColumns: ["id"]
    }
                  ]
                },"fact_check_tool_runs": {
                  Row: {
                    "fact_check_id": string,"finished_at": string | null,"id": number,"model": string | null,"started_at": string,"status": string,"summary": string | null,"tool": string
                  }
                  Insert: {
                    "fact_check_id": string,"finished_at"?: string | null,"id"?: never,"model"?: string | null,"started_at"?: string,"status": string,"summary"?: string | null,"tool": string
                  }
                  Update: {
                    "fact_check_id"?: string,"finished_at"?: string | null,"id"?: never,"model"?: string | null,"started_at"?: string,"status"?: string,"summary"?: string | null,"tool"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_check_tool_runs_fact_check_id_fkey"
      columns: ["fact_check_id"]
isOneToOne: false
      referencedRelation: "fact_checks"
      referencedColumns: ["id"]
    }
                  ]
                },"fact_checks": {
                  Row: {
                    "attempts": number,"completed_at": string | null,"confidence": string | null,"created_at": string,"device_id": string | null,"error": string | null,"full_check_status": string,"id": string,"image_path": string | null,"input_domain": string | null,"input_domain_age_days": number | null,"input_domain_tier": Database["public"]['Enums']["source_tier"] | null,"input_hash": string,"input_text": string | null,"input_type": Database["public"]['Enums']["fc_input_type"],"input_url": string | null,"is_public": boolean,"language": string | null,"locked_at": string | null,"mode": Database["public"]['Enums']["fc_mode"],"pdf_path": string | null,"report_id": string,"share_image_path": string | null,"status": Database["public"]['Enums']["fc_status"],"summary": string | null,"updated_at": string,"user_id": string | null,"verdict": Database["public"]['Enums']["fc_verdict"] | null
                  }
                  Insert: {
                    "attempts"?: number,"completed_at"?: string | null,"confidence"?: string | null,"created_at"?: string,"device_id"?: string | null,"error"?: string | null,"full_check_status"?: string,"id"?: string,"image_path"?: string | null,"input_domain"?: string | null,"input_domain_age_days"?: number | null,"input_domain_tier"?: Database["public"]['Enums']["source_tier"] | null,"input_hash": string,"input_text"?: string | null,"input_type": Database["public"]['Enums']["fc_input_type"],"input_url"?: string | null,"is_public"?: boolean,"language"?: string | null,"locked_at"?: string | null,"mode"?: Database["public"]['Enums']["fc_mode"],"pdf_path"?: string | null,"report_id"?: string,"share_image_path"?: string | null,"status"?: Database["public"]['Enums']["fc_status"],"summary"?: string | null,"updated_at"?: string,"user_id"?: string | null,"verdict"?: Database["public"]['Enums']["fc_verdict"] | null
                  }
                  Update: {
                    "attempts"?: number,"completed_at"?: string | null,"confidence"?: string | null,"created_at"?: string,"device_id"?: string | null,"error"?: string | null,"full_check_status"?: string,"id"?: string,"image_path"?: string | null,"input_domain"?: string | null,"input_domain_age_days"?: number | null,"input_domain_tier"?: Database["public"]['Enums']["source_tier"] | null,"input_hash"?: string,"input_text"?: string | null,"input_type"?: Database["public"]['Enums']["fc_input_type"],"input_url"?: string | null,"is_public"?: boolean,"language"?: string | null,"locked_at"?: string | null,"mode"?: Database["public"]['Enums']["fc_mode"],"pdf_path"?: string | null,"report_id"?: string,"share_image_path"?: string | null,"status"?: Database["public"]['Enums']["fc_status"],"summary"?: string | null,"updated_at"?: string,"user_id"?: string | null,"verdict"?: Database["public"]['Enums']["fc_verdict"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fact_checks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"channels": (string)[],"created_at": string,"data": NonNullable<Json>,"delivery_attempts": number,"delivery_error": string | null,"email_sent_at": string | null,"id": string,"push_sent_at": string | null,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  Insert: {
                    "body": string,"channels"?: (string)[],"created_at"?: string,"data"?: NonNullable<Json>,"delivery_attempts"?: number,"delivery_error"?: string | null,"email_sent_at"?: string | null,"id"?: string,"push_sent_at"?: string | null,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"channels"?: (string)[],"created_at"?: string,"data"?: NonNullable<Json>,"delivery_attempts"?: number,"delivery_error"?: string | null,"email_sent_at"?: string | null,"id"?: string,"push_sent_at"?: string | null,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "actor_id": string | null,"actor_type": Database["public"]['Enums']["actor_type"],"created_at": string,"details": NonNullable<Json>,"event": string,"from_status": Database["public"]['Enums']["order_status"] | null,"id": number,"order_id": string,"to_status": Database["public"]['Enums']["order_status"] | null
                  }
                  Insert: {
                    "actor_id"?: string | null,"actor_type": Database["public"]['Enums']["actor_type"],"created_at"?: string,"details"?: NonNullable<Json>,"event": string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: never,"order_id": string,"to_status"?: Database["public"]['Enums']["order_status"] | null
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_type"?: Database["public"]['Enums']["actor_type"],"created_at"?: string,"details"?: NonNullable<Json>,"event"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: never,"order_id"?: string,"to_status"?: Database["public"]['Enums']["order_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_images": {
                  Row: {
                    "created_at": string,"height": number | null,"id": string,"mime_type": string,"order_id": string,"original_filename": string | null,"position": number,"size_bytes": number,"storage_path": string,"width": number | null
                  }
                  Insert: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"mime_type": string,"order_id": string,"original_filename"?: string | null,"position"?: number,"size_bytes": number,"storage_path": string,"width"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"mime_type"?: string,"order_id"?: string,"original_filename"?: string | null,"position"?: number,"size_bytes"?: number,"storage_path"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_images_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_placements": {
                  Row: {
                    "channel": Database["public"]['Enums']["placement_channel"],"created_at": string,"domain_mismatch": boolean,"id": string,"live_url": string | null,"note": string | null,"order_id": string,"portal_id": string | null,"posted_at": string | null,"posted_by": string | null,"status": Database["public"]['Enums']["placement_status"],"swapped_from_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "channel": Database["public"]['Enums']["placement_channel"],"created_at"?: string,"domain_mismatch"?: boolean,"id"?: string,"live_url"?: string | null,"note"?: string | null,"order_id": string,"portal_id"?: string | null,"posted_at"?: string | null,"posted_by"?: string | null,"status"?: Database["public"]['Enums']["placement_status"],"swapped_from_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "channel"?: Database["public"]['Enums']["placement_channel"],"created_at"?: string,"domain_mismatch"?: boolean,"id"?: string,"live_url"?: string | null,"note"?: string | null,"order_id"?: string,"portal_id"?: string | null,"posted_at"?: string | null,"posted_by"?: string | null,"status"?: Database["public"]['Enums']["placement_status"],"swapped_from_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_placements_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_placements_portal_id_fkey"
      columns: ["portal_id"]
isOneToOne: false
      referencedRelation: "portals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_placements_posted_by_fkey"
      columns: ["posted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_placements_swapped_from_id_fkey"
      columns: ["swapped_from_id"]
isOneToOne: false
      referencedRelation: "order_placements"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "amount_minor": number | null,"assigned_to": string | null,"attention_reason": string | null,"body": string,"changes_requested_reason": string | null,"checkout_started_at": string | null,"claimed_at": string | null,"created_at": string,"currency": string | null,"current_intent_id": string | null,"customer_email": string | null,"customer_name": string | null,"customer_phone": string | null,"deadline_at": string | null,"deadline_warned_at": string | null,"declaration_accepted_at": string | null,"delay_notified_at": string | null,"feature_consent": boolean,"headline": string,"id": string,"instagram_handle": string | null,"needs_attention": boolean,"order_number": string,"package_id": string,"package_snapshot": Json | null,"paid_at": string | null,"paid_payment_id": string | null,"published_at": string | null,"rejection_reason": string | null,"report_path": string | null,"report_status": Database["public"]['Enums']["report_status"],"report_version": number,"status": Database["public"]['Enums']["order_status"],"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "amount_minor"?: number | null,"assigned_to"?: string | null,"attention_reason"?: string | null,"body": string,"changes_requested_reason"?: string | null,"checkout_started_at"?: string | null,"claimed_at"?: string | null,"created_at"?: string,"currency"?: string | null,"current_intent_id"?: string | null,"customer_email"?: string | null,"customer_name"?: string | null,"customer_phone"?: string | null,"deadline_at"?: string | null,"deadline_warned_at"?: string | null,"declaration_accepted_at"?: string | null,"delay_notified_at"?: string | null,"feature_consent"?: boolean,"headline": string,"id"?: string,"instagram_handle"?: string | null,"needs_attention"?: boolean,"order_number"?: string,"package_id": string,"package_snapshot"?: Json | null,"paid_at"?: string | null,"paid_payment_id"?: string | null,"published_at"?: string | null,"rejection_reason"?: string | null,"report_path"?: string | null,"report_status"?: Database["public"]['Enums']["report_status"],"report_version"?: number,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "amount_minor"?: number | null,"assigned_to"?: string | null,"attention_reason"?: string | null,"body"?: string,"changes_requested_reason"?: string | null,"checkout_started_at"?: string | null,"claimed_at"?: string | null,"created_at"?: string,"currency"?: string | null,"current_intent_id"?: string | null,"customer_email"?: string | null,"customer_name"?: string | null,"customer_phone"?: string | null,"deadline_at"?: string | null,"deadline_warned_at"?: string | null,"declaration_accepted_at"?: string | null,"delay_notified_at"?: string | null,"feature_consent"?: boolean,"headline"?: string,"id"?: string,"instagram_handle"?: string | null,"needs_attention"?: boolean,"order_number"?: string,"package_id"?: string,"package_snapshot"?: Json | null,"paid_at"?: string | null,"paid_payment_id"?: string | null,"published_at"?: string | null,"rejection_reason"?: string | null,"report_path"?: string | null,"report_status"?: Database["public"]['Enums']["report_status"],"report_version"?: number,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_current_intent_fk"
      columns: ["current_intent_id"]
isOneToOne: false
      referencedRelation: "payment_intents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_package_id_fkey"
      columns: ["package_id"]
isOneToOne: false
      referencedRelation: "packages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_paid_payment_fk"
      columns: ["paid_payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"package_portals": {
                  Row: {
                    "package_id": string,"portal_id": string
                  }
                  Insert: {
                    "package_id": string,"portal_id": string
                  }
                  Update: {
                    "package_id"?: string,"portal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "package_portals_package_id_fkey"
      columns: ["package_id"]
isOneToOne: false
      referencedRelation: "packages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "package_portals_portal_id_fkey"
      columns: ["portal_id"]
isOneToOne: false
      referencedRelation: "portals"
      referencedColumns: ["id"]
    }
                  ]
                },"packages": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"includes_instagram": boolean,"is_active": boolean,"name": string,"portal_count": number,"price_inr_paise": number,"price_usd_cents": number | null,"sort_order": number,"turnaround_hours": number,"updated_at": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"includes_instagram"?: boolean,"is_active"?: boolean,"name": string,"portal_count": number,"price_inr_paise": number,"price_usd_cents"?: number | null,"sort_order"?: number,"turnaround_hours"?: number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"includes_instagram"?: boolean,"is_active"?: boolean,"name"?: string,"portal_count"?: number,"price_inr_paise"?: number,"price_usd_cents"?: number | null,"sort_order"?: number,"turnaround_hours"?: number,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"payment_intents": {
                  Row: {
                    "amount_minor": number,"created_at": string,"currency": string,"id": string,"livemode": boolean,"order_id": string,"package_snapshot": NonNullable<Json>,"razorpay_order_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "amount_minor": number,"created_at"?: string,"currency": string,"id"?: string,"livemode": boolean,"order_id": string,"package_snapshot": NonNullable<Json>,"razorpay_order_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"currency"?: string,"id"?: string,"livemode"?: boolean,"order_id"?: string,"package_snapshot"?: NonNullable<Json>,"razorpay_order_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_intents_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_minor": number,"amount_refunded_minor": number,"captured_at": string | null,"created_at": string,"currency": string,"error_code": string | null,"error_description": string | null,"id": string,"intent_id": string,"is_duplicate": boolean,"method": string | null,"order_id": string,"raw": NonNullable<Json>,"razorpay_payment_id": string,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  Insert: {
                    "amount_minor": number,"amount_refunded_minor"?: number,"captured_at"?: string | null,"created_at"?: string,"currency": string,"error_code"?: string | null,"error_description"?: string | null,"id"?: string,"intent_id": string,"is_duplicate"?: boolean,"method"?: string | null,"order_id": string,"raw"?: NonNullable<Json>,"razorpay_payment_id": string,"status": Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"amount_refunded_minor"?: number,"captured_at"?: string | null,"created_at"?: string,"currency"?: string,"error_code"?: string | null,"error_description"?: string | null,"id"?: string,"intent_id"?: string,"is_duplicate"?: boolean,"method"?: string | null,"order_id"?: string,"raw"?: NonNullable<Json>,"razorpay_payment_id"?: string,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_intent_id_fkey"
      columns: ["intent_id"]
isOneToOne: false
      referencedRelation: "payment_intents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"portals": {
                  Row: {
                    "category": string | null,"created_at": string,"da_score": number | null,"domain": string,"homepage_url": string,"id": string,"is_active": boolean,"logo_path": string | null,"name": string,"show_publicly": boolean,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "category"?: string | null,"created_at"?: string,"da_score"?: number | null,"domain": string,"homepage_url": string,"id"?: string,"is_active"?: boolean,"logo_path"?: string | null,"name": string,"show_publicly"?: boolean,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string,"da_score"?: number | null,"domain"?: string,"homepage_url"?: string,"id"?: string,"is_active"?: boolean,"logo_path"?: string | null,"name"?: string,"show_publicly"?: boolean,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"is_active": boolean,"phone": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email": string,"full_name"?: string,"id": string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"provider_usage": {
                  Row: {
                    "calls": number,"daily_quota": number | null,"day": string,"model": string,"provider": string
                  }
                  Insert: {
                    "calls"?: number,"daily_quota"?: number | null,"day": string,"model": string,"provider": string
                  }
                  Update: {
                    "calls"?: number,"daily_quota"?: number | null,"day"?: string,"model"?: string,"provider"?: string
                  }
                  Relationships: [

                  ]
                },"refunds": {
                  Row: {
                    "amount_minor": number,"created_at": string,"id": string,"initiated_by": string | null,"order_id": string,"payment_id": string,"raw": NonNullable<Json>,"razorpay_refund_id": string | null,"reason": string,"status": Database["public"]['Enums']["refund_status"],"updated_at": string
                  }
                  Insert: {
                    "amount_minor": number,"created_at"?: string,"id"?: string,"initiated_by"?: string | null,"order_id": string,"payment_id": string,"raw"?: NonNullable<Json>,"razorpay_refund_id"?: string | null,"reason": string,"status"?: Database["public"]['Enums']["refund_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"id"?: string,"initiated_by"?: string | null,"order_id"?: string,"payment_id"?: string,"raw"?: NonNullable<Json>,"razorpay_refund_id"?: string | null,"reason"?: string,"status"?: Database["public"]['Enums']["refund_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "refunds_initiated_by_fkey"
      columns: ["initiated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"showcase_stories": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"image_path": string | null,"is_visible": boolean,"order_id": string | null,"portal_name": string,"sort_order": number,"title": string,"updated_at": string,"url": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"image_path"?: string | null,"is_visible"?: boolean,"order_id"?: string | null,"portal_name": string,"sort_order"?: number,"title": string,"updated_at"?: string,"url": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"image_path"?: string | null,"is_visible"?: boolean,"order_id"?: string | null,"portal_name"?: string,"sort_order"?: number,"title"?: string,"updated_at"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "showcase_stories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "showcase_stories_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"trusted_sources": {
                  Row: {
                    "added_by": string | null,"category": string,"created_at": string,"domain": string,"note": string | null,"tier": Database["public"]['Enums']["source_tier"],"updated_at": string
                  }
                  Insert: {
                    "added_by"?: string | null,"category": string,"created_at"?: string,"domain": string,"note"?: string | null,"tier": Database["public"]['Enums']["source_tier"],"updated_at"?: string
                  }
                  Update: {
                    "added_by"?: string | null,"category"?: string,"created_at"?: string,"domain"?: string,"note"?: string | null,"tier"?: Database["public"]['Enums']["source_tier"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trusted_sources_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"usage_counters": {
                  Row: {
                    "count": number,"day": string,"key": string,"scope": string
                  }
                  Insert: {
                    "count"?: number,"day": string,"key": string,"scope": string
                  }
                  Update: {
                    "count"?: number,"day"?: string,"key"?: string,"scope"?: string
                  }
                  Relationships: [

                  ]
                },"webhook_events": {
                  Row: {
                    "error": string | null,"event_id": string,"event_type": string,"payload": NonNullable<Json>,"processed_at": string | null,"received_at": string
                  }
                  Insert: {
                    "error"?: string | null,"event_id": string,"event_type": string,"payload": NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string
                  }
                  Update: {
                    "error"?: string | null,"event_id"?: string,"event_type"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_assign_order":
{ Args: { "p_editor_id": string,"p_order_id": string }; Returns: undefined
                           },
"admin_clear_attention":
{ Args: { "p_note": string,"p_order_id": string }; Returns: undefined
                           },
"admin_reject_order":
{ Args: { "p_order_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_reopen_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"admin_set_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"admin_set_staff_active":
{ Args: { "p_active": boolean,"p_user_id": string }; Returns: undefined
                           },
"register_device_token":
{ Args: { "p_platform": Database["public"]['Enums']["device_platform"],"p_token": string }; Returns: undefined
                           },
"staff_add_note":
{ Args: { "p_note": string,"p_order_id": string }; Returns: undefined
                           },
"staff_claim_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"staff_mark_placement_failed":
{ Args: { "p_note": string,"p_placement_id": string }; Returns: undefined
                           },
"staff_mark_published":
{ Args: { "p_allow_partial"?: boolean,"p_order_id": string }; Returns: undefined
                           },
"staff_release_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"staff_request_changes":
{ Args: { "p_order_id": string,"p_reason": string }; Returns: undefined
                           },
"staff_set_placement_link":
{ Args: { "p_placement_id": string,"p_url": string }; Returns: boolean
                           },
"staff_swap_placement":
{ Args: { "p_new_portal_id": string,"p_placement_id": string,"p_reason": string }; Returns: string
                           },
"svc_apply_payment":
{ Args: { "p_amount_minor": number,"p_captured_at"?: string,"p_currency": string,"p_error_code"?: string,"p_error_description"?: string,"p_method"?: string,"p_raw"?: Json,"p_razorpay_order_id": string,"p_razorpay_payment_id": string,"p_status": Database["public"]['Enums']["payment_status"] }; Returns: string
                           },
"svc_apply_refund":
{ Args: { "p_amount_minor": number,"p_initiated_by"?: string,"p_raw"?: Json,"p_razorpay_payment_id": string,"p_razorpay_refund_id": string,"p_reason"?: string,"p_status": Database["public"]['Enums']["refund_status"] }; Returns: string
                           },
"svc_can_delete_user":
{ Args: { "p_user": string }; Returns: boolean
                           },
"svc_claim_fact_check":
{ Args: Record<PropertyKey, never>; Returns: {
              "attempts": number,
"completed_at": string | null,
"confidence": string | null,
"created_at": string,
"device_id": string | null,
"error": string | null,
"full_check_status": string,
"id": string,
"image_path": string | null,
"input_domain": string | null,
"input_domain_age_days": number | null,
"input_domain_tier": Database["public"]['Enums']["source_tier"] | null,
"input_hash": string,
"input_text": string | null,
"input_type": Database["public"]['Enums']["fc_input_type"],
"input_url": string | null,
"is_public": boolean,
"language": string | null,
"locked_at": string | null,
"mode": Database["public"]['Enums']["fc_mode"],
"pdf_path": string | null,
"report_id": string,
"share_image_path": string | null,
"status": Database["public"]['Enums']["fc_status"],
"summary": string | null,
"updated_at": string,
"user_id": string | null,
"verdict": Database["public"]['Enums']["fc_verdict"] | null
            }
                          SetofOptions: {
        from: "*"
        to: "fact_checks"
        isOneToOne: true
        isSetofReturn: false
      } },
"svc_complete_fact_check":
{ Args: { "p_id": string,"p_result": Json }; Returns: undefined
                           },
"svc_confirm_free_order":
{ Args: { "p_order_id": string,"p_package_snapshot": Json }; Returns: {
              "amount_minor": number | null,
"assigned_to": string | null,
"attention_reason": string | null,
"body": string,
"changes_requested_reason": string | null,
"checkout_started_at": string | null,
"claimed_at": string | null,
"created_at": string,
"currency": string | null,
"current_intent_id": string | null,
"customer_email": string | null,
"customer_name": string | null,
"customer_phone": string | null,
"deadline_at": string | null,
"deadline_warned_at": string | null,
"declaration_accepted_at": string | null,
"delay_notified_at": string | null,
"feature_consent": boolean,
"headline": string,
"id": string,
"instagram_handle": string | null,
"needs_attention": boolean,
"order_number": string,
"package_id": string,
"package_snapshot": Json | null,
"paid_at": string | null,
"paid_payment_id": string | null,
"published_at": string | null,
"rejection_reason": string | null,
"report_path": string | null,
"report_status": Database["public"]['Enums']["report_status"],
"report_version": number,
"status": Database["public"]['Enums']["order_status"],
"updated_at": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"svc_consume_quota":
{ Args: { "p_key": string,"p_limit": number,"p_scope": string }; Returns: boolean
                           },
"svc_create_payment_intent":
{ Args: { "p_amount_minor": number,"p_currency": string,"p_livemode": boolean,"p_order_id": string,"p_package_snapshot": Json,"p_razorpay_order_id": string }; Returns: {
              "amount_minor": number,
"created_at": string,
"currency": string,
"id": string,
"livemode": boolean,
"order_id": string,
"package_snapshot": NonNullable<Json>,
"razorpay_order_id": string,
"status": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "payment_intents"
        isOneToOne: true
        isSetofReturn: false
      } },
"svc_deadline_sweep":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"svc_expire_pending_orders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"svc_fail_fact_check":
{ Args: { "p_error": string,"p_id": string,"p_retry"?: boolean }; Returns: string
                           },
"svc_finish_webhook":
{ Args: { "p_error"?: string,"p_event_id": string }; Returns: undefined
                           },
"svc_provider_usage_ratio":
{ Args: { "p_model": string,"p_provider": string }; Returns: number
                           },
"svc_record_webhook":
{ Args: { "p_event_id": string,"p_event_type": string,"p_payload": Json }; Returns: boolean
                           },
"svc_refund_quota":
{ Args: { "p_key": string,"p_scope": string }; Returns: undefined
                           },
"svc_reopen_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"svc_set_report":
{ Args: { "p_order_id": string,"p_path"?: string,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"svc_use_provider":
{ Args: { "p_default_quota"?: number,"p_model": string,"p_provider": string }; Returns: boolean
                           },
"user_cancel_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"user_resubmit_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "actor_type": "user"|"staff"|"system"|"razorpay","app_role": "user"|"editor"|"admin","device_platform": "ios"|"android"|"web","fc_input_type": "text"|"url"|"image","fc_mode": "full"|"reduced","fc_status": "queued"|"processing"|"done"|"failed","fc_verdict": "likely_false"|"misleading"|"likely_true"|"unverified","order_status": "draft"|"pending_payment"|"paid"|"in_progress"|"changes_requested"|"published"|"rejected"|"refunded"|"cancelled"|"expired","payment_status": "created"|"authorized"|"captured"|"failed"|"refunded"|"partially_refunded","placement_channel": "portal"|"instagram","placement_status": "pending"|"live"|"failed"|"swapped","refund_status": "pending"|"processed"|"failed","report_status": "not_started"|"generating"|"ready"|"failed","source_tier": "tier1"|"tier2"|"unknown"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "actor_type": ["user", "staff", "system", "razorpay"],"app_role": ["user", "editor", "admin"],"device_platform": ["ios", "android", "web"],"fc_input_type": ["text", "url", "image"],"fc_mode": ["full", "reduced"],"fc_status": ["queued", "processing", "done", "failed"],"fc_verdict": ["likely_false", "misleading", "likely_true", "unverified"],"order_status": ["draft", "pending_payment", "paid", "in_progress", "changes_requested", "published", "rejected", "refunded", "cancelled", "expired"],"payment_status": ["created", "authorized", "captured", "failed", "refunded", "partially_refunded"],"placement_channel": ["portal", "instagram"],"placement_status": ["pending", "live", "failed", "swapped"],"refund_status": ["pending", "processed", "failed"],"report_status": ["not_started", "generating", "ready", "failed"],"source_tier": ["tier1", "tier2", "unknown"]
          }
        }
} as const
