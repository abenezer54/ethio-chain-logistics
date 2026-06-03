package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
)

type AdminAnalyticsRepo struct {
	pool *Pool
}

func NewAdminAnalyticsRepo(pool *Pool) *AdminAnalyticsRepo {
	return &AdminAnalyticsRepo{pool: pool}
}

func (r *AdminAnalyticsRepo) GetAdminAnalytics(ctx context.Context) (domain.AdminAnalytics, error) {
	out := domain.AdminAnalytics{GeneratedAt: time.Now().UTC()}
	var err error

	if out.Users, err = r.userAnalytics(ctx); err != nil {
		return domain.AdminAnalytics{}, err
	}
	if out.Overview, err = r.shipmentOverview(ctx); err != nil {
		return domain.AdminAnalytics{}, err
	}
	if out.ShipmentsByStatus, err = r.shipmentsByStatus(ctx); err != nil {
		return domain.AdminAnalytics{}, err
	}
	if out.OngoingShipments, err = r.shipmentSummaries(ctx, false, 50); err != nil {
		return domain.AdminAnalytics{}, err
	}
	if out.ActionRequiredShipments, err = r.shipmentSummaries(ctx, true, 25); err != nil {
		return domain.AdminAnalytics{}, err
	}
	if out.RecentEvents, err = r.recentEvents(ctx, 20); err != nil {
		return domain.AdminAnalytics{}, err
	}
	if out.Documents, err = r.documentHealth(ctx); err != nil {
		return domain.AdminAnalytics{}, err
	}
	if out.Transport, err = r.transportHealth(ctx); err != nil {
		return domain.AdminAnalytics{}, err
	}
	if out.Blockchain, err = r.blockchainHealth(ctx); err != nil {
		return domain.AdminAnalytics{}, err
	}
	return out, nil
}

func (r *AdminAnalyticsRepo) userAnalytics(ctx context.Context) (domain.AdminUserAnalytics, error) {
	const totalsQ = `
SELECT
  COUNT(*)::bigint,
  COUNT(*) FILTER (WHERE status = 'ACTIVE')::bigint,
  COUNT(*) FILTER (WHERE status = 'PENDING')::bigint,
  COUNT(*) FILTER (WHERE status = 'DENIED')::bigint,
  COUNT(*) FILTER (WHERE status = 'INFO_REQUIRED')::bigint,
  COUNT(*) FILTER (WHERE email_verified_at IS NULL AND role <> 'ADMIN')::bigint
FROM users
`
	var out domain.AdminUserAnalytics
	if err := r.pool.inner.QueryRow(ctx, totalsQ).Scan(
		&out.Total,
		&out.Active,
		&out.Pending,
		&out.Denied,
		&out.InfoRequired,
		&out.EmailUnverified,
	); err != nil {
		return domain.AdminUserAnalytics{}, fmt.Errorf("admin user totals: %w", err)
	}

	byRole, err := r.counts(ctx, "SELECT role, COUNT(*)::bigint FROM users GROUP BY role ORDER BY role")
	if err != nil {
		return domain.AdminUserAnalytics{}, fmt.Errorf("admin users by role: %w", err)
	}
	byStatus, err := r.counts(ctx, "SELECT status, COUNT(*)::bigint FROM users GROUP BY status ORDER BY status")
	if err != nil {
		return domain.AdminUserAnalytics{}, fmt.Errorf("admin users by status: %w", err)
	}
	out.ByRole = byRole
	out.ByStatus = byStatus

	const roleStatusQ = `
SELECT role, status, COUNT(*)::bigint
FROM users
GROUP BY role, status
ORDER BY role, status
`
	rows, err := r.pool.inner.Query(ctx, roleStatusQ)
	if err != nil {
		return domain.AdminUserAnalytics{}, fmt.Errorf("admin users by role/status: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var item domain.AdminRoleStatusCount
		var role, status string
		if err := rows.Scan(&role, &status, &item.Count); err != nil {
			return domain.AdminUserAnalytics{}, fmt.Errorf("scan users by role/status: %w", err)
		}
		item.Role = domain.UserRole(role)
		item.Status = domain.UserStatus(status)
		out.ByRoleStatus = append(out.ByRoleStatus, item)
	}
	if err := rows.Err(); err != nil {
		return domain.AdminUserAnalytics{}, fmt.Errorf("iterate users by role/status: %w", err)
	}
	return out, nil
}

func (r *AdminAnalyticsRepo) shipmentOverview(ctx context.Context) (domain.AdminShipmentOverview, error) {
	const q = `
WITH shipment_flags AS (
  SELECT
    s.*,
    COALESCE(a.allocation_count, 0) AS allocation_count,
    EXISTS (
      SELECT 1
      FROM blockchain_anchor_jobs j
      WHERE j.shipment_id = s.id
        AND j.status = 'FAILED'
    ) AS has_failed_anchor
  FROM shipments s
  LEFT JOIN (
    SELECT shipment_id, COUNT(*)::bigint AS allocation_count
    FROM shipment_allocations
    GROUP BY shipment_id
  ) a ON a.shipment_id = s.id
)
SELECT
  COUNT(*)::bigint,
  COUNT(*) FILTER (WHERE status NOT IN ('CLEARED', 'REJECTED'))::bigint,
  COUNT(*) FILTER (WHERE status = 'INITIATED')::bigint,
  COUNT(*) FILTER (WHERE status IN ('DOCS_UPLOADED', 'PENDING_VERIFICATION'))::bigint,
  COUNT(*) FILTER (WHERE status IN ('VERIFIED', 'EXPORT_DOCS_UPLOADED') AND allocation_count = 0)::bigint,
  COUNT(*) FILTER (WHERE status = 'ALLOCATED')::bigint,
  COUNT(*) FILTER (WHERE status = 'IN_TRANSIT')::bigint,
  COUNT(*) FILTER (WHERE status = 'ARRIVED')::bigint,
  COUNT(*) FILTER (WHERE status = 'AT_CUSTOMS')::bigint,
  COUNT(*) FILTER (WHERE status = 'HELD_FOR_INSPECTION')::bigint,
  COUNT(*) FILTER (WHERE status = 'CLEARED')::bigint,
  COUNT(*) FILTER (WHERE status = 'REJECTED')::bigint,
  COUNT(*) FILTER (
    WHERE status IN (
      'INITIATED',
      'DOCS_UPLOADED',
      'PENDING_VERIFICATION',
      'ALLOCATED',
      'ARRIVED',
      'AT_CUSTOMS',
      'HELD_FOR_INSPECTION',
      'REJECTED'
    )
    OR (status IN ('VERIFIED', 'EXPORT_DOCS_UPLOADED') AND allocation_count = 0)
    OR anchor_status = 'FAILED'
    OR has_failed_anchor
  )::bigint,
  COUNT(*) FILTER (WHERE anchor_status = 'FAILED' OR has_failed_anchor)::bigint
FROM shipment_flags
`
	var out domain.AdminShipmentOverview
	if err := r.pool.inner.QueryRow(ctx, q).Scan(
		&out.Total,
		&out.Active,
		&out.AwaitingDocuments,
		&out.AwaitingSellerVerification,
		&out.AwaitingESLAllocation,
		&out.AllocatedAwaitingDeparture,
		&out.InTransit,
		&out.Arrived,
		&out.AtCustoms,
		&out.HeldForInspection,
		&out.Cleared,
		&out.Rejected,
		&out.ActionRequired,
		&out.FailedBlockchainProofs,
	); err != nil {
		return domain.AdminShipmentOverview{}, fmt.Errorf("admin shipment overview: %w", err)
	}
	return out, nil
}

func (r *AdminAnalyticsRepo) shipmentsByStatus(ctx context.Context) ([]domain.AdminCount, error) {
	counts, err := r.counts(ctx, "SELECT status, COUNT(*)::bigint FROM shipments GROUP BY status ORDER BY status")
	if err != nil {
		return nil, fmt.Errorf("admin shipments by status: %w", err)
	}
	return counts, nil
}

func (r *AdminAnalyticsRepo) shipmentSummaries(ctx context.Context, actionRequired bool, limit int) ([]domain.AdminShipmentSummary, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	filter := "WHERE s.status NOT IN ('CLEARED', 'REJECTED')"
	if actionRequired {
		filter = `
WHERE action_reason <> ''
`
	}
	q := `
WITH transport_refs AS (
  SELECT
    a.shipment_id,
    string_agg(DISTINCT ts.reference_code, ', ' ORDER BY ts.reference_code) AS refs,
    COUNT(*)::bigint AS allocation_count
  FROM shipment_allocations a
  JOIN transport_slots ts ON ts.id = a.transport_slot_id
  GROUP BY a.shipment_id
),
failed_anchors AS (
  SELECT shipment_id, COUNT(*)::bigint AS failed_count
  FROM blockchain_anchor_jobs
  WHERE status = 'FAILED'
  GROUP BY shipment_id
),
base AS (
  SELECT
    s.id,
    s.importer_id,
    COALESCE(NULLIF(importer.business_name, ''), NULLIF(importer.full_name, ''), importer.email, '') AS importer_name,
    COALESCE(importer.email, '') AS importer_email,
    s.seller_id,
    COALESCE(NULLIF(seller.business_name, ''), NULLIF(seller.full_name, ''), seller.email, '') AS seller_name,
    COALESCE(seller.email, '') AS seller_email,
    s.origin_port,
    s.destination_port,
    s.cargo_type,
    s.weight_kg::text,
    COALESCE(s.volume_cbm::text, '') AS volume_cbm,
    s.status,
    s.anchor_status,
    COALESCE(tr.refs, '') AS transport_refs,
    le.action AS last_event_action,
    le.message AS last_event_message,
    le.created_at AS last_event_at,
    s.created_at,
    s.updated_at,
    CASE
      WHEN s.anchor_status = 'FAILED' OR COALESCE(fa.failed_count, 0) > 0 THEN 'Blockchain proof failed'
      WHEN s.status = 'INITIATED' THEN 'Missing shipment documents'
      WHEN s.status IN ('DOCS_UPLOADED', 'PENDING_VERIFICATION') THEN 'Seller verification pending'
      WHEN s.status IN ('VERIFIED', 'EXPORT_DOCS_UPLOADED') AND COALESCE(tr.allocation_count, 0) = 0 THEN 'Ready for ESL allocation'
      WHEN s.status = 'ALLOCATED' THEN 'Allocated; waiting for transport milestone'
      WHEN s.status = 'ARRIVED' THEN 'Arrived; customs release needed'
      WHEN s.status = 'AT_CUSTOMS' THEN 'At customs; clearance pending'
      WHEN s.status = 'HELD_FOR_INSPECTION' THEN 'Held for inspection'
      WHEN s.status = 'REJECTED' THEN 'Rejected shipment'
      ELSE ''
    END AS action_reason
  FROM shipments s
  JOIN users importer ON importer.id = s.importer_id
  LEFT JOIN users seller ON seller.id = s.seller_id
  LEFT JOIN transport_refs tr ON tr.shipment_id = s.id
  LEFT JOIN failed_anchors fa ON fa.shipment_id = s.id
  LEFT JOIN LATERAL (
    SELECT action, COALESCE(message, '') AS message, created_at
    FROM shipment_events e
    WHERE e.shipment_id = s.id
    ORDER BY created_at DESC
    LIMIT 1
  ) le ON true
)
SELECT
  id::text,
  importer_id::text,
  importer_name,
  importer_email,
  COALESCE(seller_id::text, ''),
  seller_name,
  seller_email,
  origin_port,
  destination_port,
  cargo_type,
  weight_kg,
  volume_cbm,
  status,
  anchor_status,
  transport_refs,
  action_reason,
  COALESCE(last_event_action, ''),
  COALESCE(last_event_message, ''),
  last_event_at,
  created_at,
  updated_at
FROM base s
` + filter + `
ORDER BY updated_at DESC, created_at DESC
LIMIT $1
`
	rows, err := r.pool.inner.Query(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("admin shipment summaries: %w", err)
	}
	defer rows.Close()

	out := make([]domain.AdminShipmentSummary, 0, limit)
	for rows.Next() {
		var item domain.AdminShipmentSummary
		var status, anchorStatus string
		if err := rows.Scan(
			&item.ID,
			&item.ImporterID,
			&item.ImporterName,
			&item.ImporterEmail,
			&item.SellerID,
			&item.SellerName,
			&item.SellerEmail,
			&item.OriginPort,
			&item.DestinationPort,
			&item.CargoType,
			&item.WeightKG,
			&item.VolumeCBM,
			&status,
			&anchorStatus,
			&item.TransportRefs,
			&item.ActionReason,
			&item.LastEventAction,
			&item.LastEventMessage,
			&item.LastEventAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan admin shipment summary: %w", err)
		}
		item.Status = domain.ShipmentStatus(status)
		item.AnchorStatus = domain.AnchorStatus(anchorStatus)
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin shipment summaries: %w", err)
	}
	return out, nil
}

func (r *AdminAnalyticsRepo) recentEvents(ctx context.Context, limit int) ([]domain.AdminShipmentEventSummary, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	const q = `
SELECT
  e.id::text,
  e.shipment_id::text,
  s.status,
  e.actor_role,
  e.action,
  COALESCE(e.message, ''),
  e.anchor_status,
  e.created_at
FROM shipment_events e
JOIN shipments s ON s.id = e.shipment_id
ORDER BY e.created_at DESC
LIMIT $1
`
	rows, err := r.pool.inner.Query(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("admin recent shipment events: %w", err)
	}
	defer rows.Close()
	out := make([]domain.AdminShipmentEventSummary, 0, limit)
	for rows.Next() {
		var item domain.AdminShipmentEventSummary
		var shipmentStatus, actorRole, anchorStatus string
		if err := rows.Scan(
			&item.ID,
			&item.ShipmentID,
			&shipmentStatus,
			&actorRole,
			&item.Action,
			&item.Message,
			&anchorStatus,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan admin recent event: %w", err)
		}
		item.ShipmentStatus = domain.ShipmentStatus(shipmentStatus)
		item.ActorRole = domain.UserRole(actorRole)
		item.AnchorStatus = domain.AnchorStatus(anchorStatus)
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin recent events: %w", err)
	}
	return out, nil
}

func (r *AdminAnalyticsRepo) documentHealth(ctx context.Context) (domain.AdminDocumentHealth, error) {
	const totalsQ = `
SELECT
  (SELECT COUNT(*)::bigint FROM shipment_documents),
  (SELECT COUNT(*)::bigint FROM seller_documents),
  (SELECT COUNT(*)::bigint FROM shipment_documents WHERE verification_status = 'PENDING'),
  (SELECT COUNT(*)::bigint FROM shipment_documents WHERE verification_status = 'MATCHED'),
  (SELECT COUNT(*)::bigint FROM shipment_documents WHERE verification_status = 'MISMATCHED'),
  (SELECT COUNT(*)::bigint FROM shipment_documents WHERE verification_status = 'REJECTED')
`
	var out domain.AdminDocumentHealth
	if err := r.pool.inner.QueryRow(ctx, totalsQ).Scan(
		&out.ShipmentDocumentsTotal,
		&out.SellerDocumentsTotal,
		&out.PendingVerification,
		&out.Matched,
		&out.Mismatched,
		&out.Rejected,
	); err != nil {
		return domain.AdminDocumentHealth{}, fmt.Errorf("admin document totals: %w", err)
	}

	verification, err := r.counts(ctx, "SELECT verification_status, COUNT(*)::bigint FROM shipment_documents GROUP BY verification_status ORDER BY verification_status")
	if err != nil {
		return domain.AdminDocumentHealth{}, fmt.Errorf("admin documents by verification: %w", err)
	}
	anchors, err := r.counts(ctx, `
SELECT anchor_status, SUM(count)::bigint
FROM (
  SELECT anchor_status, COUNT(*)::bigint AS count FROM shipment_documents GROUP BY anchor_status
  UNION ALL
  SELECT anchor_status, COUNT(*)::bigint AS count FROM seller_documents GROUP BY anchor_status
) d
GROUP BY anchor_status
ORDER BY anchor_status
`)
	if err != nil {
		return domain.AdminDocumentHealth{}, fmt.Errorf("admin documents by anchor: %w", err)
	}
	out.ByVerificationStatus = verification
	out.ByAnchorStatus = anchors
	return out, nil
}

func (r *AdminAnalyticsRepo) transportHealth(ctx context.Context) (domain.AdminTransportHealth, error) {
	const totalsQ = `
SELECT
  COUNT(*)::bigint,
  COUNT(*) FILTER (WHERE status = 'AVAILABLE')::bigint,
  COUNT(*) FILTER (WHERE status = 'BOOKED')::bigint,
  COUNT(*) FILTER (WHERE status = 'MAINTENANCE')::bigint,
  COALESCE(SUM(remaining_capacity_kg), 0)::text
FROM transport_slots
`
	var out domain.AdminTransportHealth
	if err := r.pool.inner.QueryRow(ctx, totalsQ).Scan(
		&out.SlotsTotal,
		&out.AvailableSlots,
		&out.BookedSlots,
		&out.MaintenanceSlots,
		&out.RemainingCapacityKG,
	); err != nil {
		return domain.AdminTransportHealth{}, fmt.Errorf("admin transport totals: %w", err)
	}

	const allocatedQ = "SELECT COUNT(DISTINCT shipment_id)::bigint FROM shipment_allocations"
	if err := r.pool.inner.QueryRow(ctx, allocatedQ).Scan(&out.AllocatedShipments); err != nil {
		return domain.AdminTransportHealth{}, fmt.Errorf("admin allocated shipments: %w", err)
	}

	const slotsQ = `
SELECT
  id::text,
  transport_type,
  name,
  reference_code,
  origin,
  destination,
  remaining_capacity_kg::text,
  available_from,
  status
FROM transport_slots
WHERE status = 'AVAILABLE'
ORDER BY available_from ASC, transport_type ASC, name ASC
LIMIT 8
`
	rows, err := r.pool.inner.Query(ctx, slotsQ)
	if err != nil {
		return domain.AdminTransportHealth{}, fmt.Errorf("admin upcoming transport slots: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var item domain.AdminTransportSlotSummary
		var transportType, status string
		if err := rows.Scan(
			&item.ID,
			&transportType,
			&item.Name,
			&item.ReferenceCode,
			&item.Origin,
			&item.Destination,
			&item.RemainingCapacityKG,
			&item.AvailableFrom,
			&status,
		); err != nil {
			return domain.AdminTransportHealth{}, fmt.Errorf("scan admin transport slot: %w", err)
		}
		item.TransportType = domain.TransportType(transportType)
		item.Status = domain.TransportSlotStatus(status)
		out.UpcomingDepartures = append(out.UpcomingDepartures, item)
	}
	if err := rows.Err(); err != nil {
		return domain.AdminTransportHealth{}, fmt.Errorf("iterate admin transport slots: %w", err)
	}
	return out, nil
}

func (r *AdminAnalyticsRepo) blockchainHealth(ctx context.Context) (domain.AdminBlockchainHealth, error) {
	const q = `
SELECT
  COUNT(*)::bigint,
  COUNT(*) FILTER (WHERE status = 'PENDING')::bigint,
  COUNT(*) FILTER (WHERE status = 'PROCESSING')::bigint,
  COUNT(*) FILTER (WHERE status = 'ANCHORED')::bigint,
  COUNT(*) FILTER (WHERE status = 'FAILED')::bigint
FROM blockchain_anchor_jobs
`
	var out domain.AdminBlockchainHealth
	if err := r.pool.inner.QueryRow(ctx, q).Scan(
		&out.JobsTotal,
		&out.Pending,
		&out.Processing,
		&out.Anchored,
		&out.Failed,
	); err != nil {
		return domain.AdminBlockchainHealth{}, fmt.Errorf("admin blockchain totals: %w", err)
	}
	counts, err := r.counts(ctx, "SELECT status, COUNT(*)::bigint FROM blockchain_anchor_jobs GROUP BY status ORDER BY status")
	if err != nil {
		return domain.AdminBlockchainHealth{}, fmt.Errorf("admin blockchain by status: %w", err)
	}
	out.ByStatus = counts
	return out, nil
}

func (r *AdminAnalyticsRepo) counts(ctx context.Context, q string) ([]domain.AdminCount, error) {
	rows, err := r.pool.inner.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.AdminCount{}
	for rows.Next() {
		var item domain.AdminCount
		if err := rows.Scan(&item.Key, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}
