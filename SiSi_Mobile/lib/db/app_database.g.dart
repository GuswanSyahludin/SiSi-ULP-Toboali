// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $GlobalHeadersTable extends GlobalHeaders
    with TableInfo<$GlobalHeadersTable, GlobalHeader> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GlobalHeadersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _noMeta = const VerificationMeta('no');
  @override
  late final GeneratedColumn<int> no = GeneratedColumn<int>(
      'no', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _kodeHeaderMeta =
      const VerificationMeta('kodeHeader');
  @override
  late final GeneratedColumn<String> kodeHeader = GeneratedColumn<String>(
      'kode_header', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _ulpMeta = const VerificationMeta('ulp');
  @override
  late final GeneratedColumn<String> ulp = GeneratedColumn<String>(
      'ulp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _hariMeta = const VerificationMeta('hari');
  @override
  late final GeneratedColumn<String> hari = GeneratedColumn<String>(
      'hari', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tanggalMeta =
      const VerificationMeta('tanggal');
  @override
  late final GeneratedColumn<String> tanggal = GeneratedColumn<String>(
      'tanggal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _timMeta = const VerificationMeta('tim');
  @override
  late final GeneratedColumn<String> tim = GeneratedColumn<String>(
      'tim', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _subTimMeta = const VerificationMeta('subTim');
  @override
  late final GeneratedColumn<String> subTim = GeneratedColumn<String>(
      'sub_tim', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _koordinatAwalMeta =
      const VerificationMeta('koordinatAwal');
  @override
  late final GeneratedColumn<String> koordinatAwal = GeneratedColumn<String>(
      'koordinat_awal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _koordinatAkhirMeta =
      const VerificationMeta('koordinatAkhir');
  @override
  late final GeneratedColumn<String> koordinatAkhir = GeneratedColumn<String>(
      'koordinat_akhir', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kmAwalMeta = const VerificationMeta('kmAwal');
  @override
  late final GeneratedColumn<String> kmAwal = GeneratedColumn<String>(
      'km_awal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kmAkhirMeta =
      const VerificationMeta('kmAkhir');
  @override
  late final GeneratedColumn<String> kmAkhir = GeneratedColumn<String>(
      'km_akhir', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kendalaMeta =
      const VerificationMeta('kendala');
  @override
  late final GeneratedColumn<String> kendala = GeneratedColumn<String>(
      'kendala', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _waTextMeta = const VerificationMeta('waText');
  @override
  late final GeneratedColumn<String> waText = GeneratedColumn<String>(
      'wa_text', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _timestampMeta =
      const VerificationMeta('timestamp');
  @override
  late final GeneratedColumn<String> timestamp = GeneratedColumn<String>(
      'timestamp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _inputByMeta =
      const VerificationMeta('inputBy');
  @override
  late final GeneratedColumn<String> inputBy = GeneratedColumn<String>(
      'input_by', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _timestampUpdateMeta =
      const VerificationMeta('timestampUpdate');
  @override
  late final GeneratedColumn<String> timestampUpdate = GeneratedColumn<String>(
      'timestamp_update', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _statusTextWaMeta =
      const VerificationMeta('statusTextWa');
  @override
  late final GeneratedColumn<String> statusTextWa = GeneratedColumn<String>(
      'status_text_wa', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns => [
        no,
        kodeHeader,
        ulp,
        hari,
        tanggal,
        tim,
        subTim,
        koordinatAwal,
        koordinatAkhir,
        kmAwal,
        kmAkhir,
        kendala,
        waText,
        timestamp,
        inputBy,
        timestampUpdate,
        statusTextWa
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'global_header';
  @override
  VerificationContext validateIntegrity(Insertable<GlobalHeader> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('no')) {
      context.handle(_noMeta, no.isAcceptableOrUnknown(data['no']!, _noMeta));
    }
    if (data.containsKey('kode_header')) {
      context.handle(
          _kodeHeaderMeta,
          kodeHeader.isAcceptableOrUnknown(
              data['kode_header']!, _kodeHeaderMeta));
    } else if (isInserting) {
      context.missing(_kodeHeaderMeta);
    }
    if (data.containsKey('ulp')) {
      context.handle(
          _ulpMeta, ulp.isAcceptableOrUnknown(data['ulp']!, _ulpMeta));
    }
    if (data.containsKey('hari')) {
      context.handle(
          _hariMeta, hari.isAcceptableOrUnknown(data['hari']!, _hariMeta));
    }
    if (data.containsKey('tanggal')) {
      context.handle(_tanggalMeta,
          tanggal.isAcceptableOrUnknown(data['tanggal']!, _tanggalMeta));
    }
    if (data.containsKey('tim')) {
      context.handle(
          _timMeta, tim.isAcceptableOrUnknown(data['tim']!, _timMeta));
    }
    if (data.containsKey('sub_tim')) {
      context.handle(_subTimMeta,
          subTim.isAcceptableOrUnknown(data['sub_tim']!, _subTimMeta));
    }
    if (data.containsKey('koordinat_awal')) {
      context.handle(
          _koordinatAwalMeta,
          koordinatAwal.isAcceptableOrUnknown(
              data['koordinat_awal']!, _koordinatAwalMeta));
    }
    if (data.containsKey('koordinat_akhir')) {
      context.handle(
          _koordinatAkhirMeta,
          koordinatAkhir.isAcceptableOrUnknown(
              data['koordinat_akhir']!, _koordinatAkhirMeta));
    }
    if (data.containsKey('km_awal')) {
      context.handle(_kmAwalMeta,
          kmAwal.isAcceptableOrUnknown(data['km_awal']!, _kmAwalMeta));
    }
    if (data.containsKey('km_akhir')) {
      context.handle(_kmAkhirMeta,
          kmAkhir.isAcceptableOrUnknown(data['km_akhir']!, _kmAkhirMeta));
    }
    if (data.containsKey('kendala')) {
      context.handle(_kendalaMeta,
          kendala.isAcceptableOrUnknown(data['kendala']!, _kendalaMeta));
    }
    if (data.containsKey('wa_text')) {
      context.handle(_waTextMeta,
          waText.isAcceptableOrUnknown(data['wa_text']!, _waTextMeta));
    }
    if (data.containsKey('timestamp')) {
      context.handle(_timestampMeta,
          timestamp.isAcceptableOrUnknown(data['timestamp']!, _timestampMeta));
    }
    if (data.containsKey('input_by')) {
      context.handle(_inputByMeta,
          inputBy.isAcceptableOrUnknown(data['input_by']!, _inputByMeta));
    }
    if (data.containsKey('timestamp_update')) {
      context.handle(
          _timestampUpdateMeta,
          timestampUpdate.isAcceptableOrUnknown(
              data['timestamp_update']!, _timestampUpdateMeta));
    }
    if (data.containsKey('status_text_wa')) {
      context.handle(
          _statusTextWaMeta,
          statusTextWa.isAcceptableOrUnknown(
              data['status_text_wa']!, _statusTextWaMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {kodeHeader};
  @override
  GlobalHeader map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GlobalHeader(
      no: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}no']),
      kodeHeader: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kode_header'])!,
      ulp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ulp'])!,
      hari: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}hari'])!,
      tanggal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tanggal'])!,
      tim: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tim'])!,
      subTim: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sub_tim'])!,
      koordinatAwal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}koordinat_awal'])!,
      koordinatAkhir: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}koordinat_akhir'])!,
      kmAwal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}km_awal'])!,
      kmAkhir: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}km_akhir'])!,
      kendala: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kendala'])!,
      waText: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wa_text'])!,
      timestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}timestamp'])!,
      inputBy: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}input_by'])!,
      timestampUpdate: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}timestamp_update'])!,
      statusTextWa: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status_text_wa'])!,
    );
  }

  @override
  $GlobalHeadersTable createAlias(String alias) {
    return $GlobalHeadersTable(attachedDatabase, alias);
  }
}

class GlobalHeader extends DataClass implements Insertable<GlobalHeader> {
  /// A — No: nomor urut di sheet (bukan kunci; bisa bergeser)
  final int? no;

  /// B — Kode Header: kunci utama & kunci relasi (FK) ke tabel anak
  final String kodeHeader;

  /// C — ULP
  final String ulp;

  /// D — Hari (Senin..Minggu)
  final String hari;

  /// E — Tanggal, TEXT format ISO "yyyy-MM-dd"
  final String tanggal;

  /// F — Tim (ROW / Hartek / Inspeksi Jaringan / ...)
  final String tim;

  /// G — Sub-Tim (dipakai filter di mobile)
  final String subTim;

  /// H — Koordinat Awal
  final String koordinatAwal;

  /// I — Koordinat Akhir
  final String koordinatAkhir;

  /// J — Km Awal (teks; bisa berisi "4,1")
  final String kmAwal;

  /// K — Km Akhir (teks)
  final String kmAkhir;

  /// L — Kendala
  final String kendala;

  /// M — WA Text (laporan hasil generate; teks panjang)
  final String waText;

  /// N — Timestamp input (string ISO)
  final String timestamp;

  /// O — Input By (username penginput)
  final String inputBy;

  /// P — Timestamp Update terakhir (di-stempel WA engine)
  final String timestampUpdate;

  /// Q — Status TextWA (mis. "Update")
  final String statusTextWa;
  const GlobalHeader(
      {this.no,
      required this.kodeHeader,
      required this.ulp,
      required this.hari,
      required this.tanggal,
      required this.tim,
      required this.subTim,
      required this.koordinatAwal,
      required this.koordinatAkhir,
      required this.kmAwal,
      required this.kmAkhir,
      required this.kendala,
      required this.waText,
      required this.timestamp,
      required this.inputBy,
      required this.timestampUpdate,
      required this.statusTextWa});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (!nullToAbsent || no != null) {
      map['no'] = Variable<int>(no);
    }
    map['kode_header'] = Variable<String>(kodeHeader);
    map['ulp'] = Variable<String>(ulp);
    map['hari'] = Variable<String>(hari);
    map['tanggal'] = Variable<String>(tanggal);
    map['tim'] = Variable<String>(tim);
    map['sub_tim'] = Variable<String>(subTim);
    map['koordinat_awal'] = Variable<String>(koordinatAwal);
    map['koordinat_akhir'] = Variable<String>(koordinatAkhir);
    map['km_awal'] = Variable<String>(kmAwal);
    map['km_akhir'] = Variable<String>(kmAkhir);
    map['kendala'] = Variable<String>(kendala);
    map['wa_text'] = Variable<String>(waText);
    map['timestamp'] = Variable<String>(timestamp);
    map['input_by'] = Variable<String>(inputBy);
    map['timestamp_update'] = Variable<String>(timestampUpdate);
    map['status_text_wa'] = Variable<String>(statusTextWa);
    return map;
  }

  GlobalHeadersCompanion toCompanion(bool nullToAbsent) {
    return GlobalHeadersCompanion(
      no: no == null && nullToAbsent ? const Value.absent() : Value(no),
      kodeHeader: Value(kodeHeader),
      ulp: Value(ulp),
      hari: Value(hari),
      tanggal: Value(tanggal),
      tim: Value(tim),
      subTim: Value(subTim),
      koordinatAwal: Value(koordinatAwal),
      koordinatAkhir: Value(koordinatAkhir),
      kmAwal: Value(kmAwal),
      kmAkhir: Value(kmAkhir),
      kendala: Value(kendala),
      waText: Value(waText),
      timestamp: Value(timestamp),
      inputBy: Value(inputBy),
      timestampUpdate: Value(timestampUpdate),
      statusTextWa: Value(statusTextWa),
    );
  }

  factory GlobalHeader.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GlobalHeader(
      no: serializer.fromJson<int?>(json['no']),
      kodeHeader: serializer.fromJson<String>(json['kodeHeader']),
      ulp: serializer.fromJson<String>(json['ulp']),
      hari: serializer.fromJson<String>(json['hari']),
      tanggal: serializer.fromJson<String>(json['tanggal']),
      tim: serializer.fromJson<String>(json['tim']),
      subTim: serializer.fromJson<String>(json['subTim']),
      koordinatAwal: serializer.fromJson<String>(json['koordinatAwal']),
      koordinatAkhir: serializer.fromJson<String>(json['koordinatAkhir']),
      kmAwal: serializer.fromJson<String>(json['kmAwal']),
      kmAkhir: serializer.fromJson<String>(json['kmAkhir']),
      kendala: serializer.fromJson<String>(json['kendala']),
      waText: serializer.fromJson<String>(json['waText']),
      timestamp: serializer.fromJson<String>(json['timestamp']),
      inputBy: serializer.fromJson<String>(json['inputBy']),
      timestampUpdate: serializer.fromJson<String>(json['timestampUpdate']),
      statusTextWa: serializer.fromJson<String>(json['statusTextWa']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'no': serializer.toJson<int?>(no),
      'kodeHeader': serializer.toJson<String>(kodeHeader),
      'ulp': serializer.toJson<String>(ulp),
      'hari': serializer.toJson<String>(hari),
      'tanggal': serializer.toJson<String>(tanggal),
      'tim': serializer.toJson<String>(tim),
      'subTim': serializer.toJson<String>(subTim),
      'koordinatAwal': serializer.toJson<String>(koordinatAwal),
      'koordinatAkhir': serializer.toJson<String>(koordinatAkhir),
      'kmAwal': serializer.toJson<String>(kmAwal),
      'kmAkhir': serializer.toJson<String>(kmAkhir),
      'kendala': serializer.toJson<String>(kendala),
      'waText': serializer.toJson<String>(waText),
      'timestamp': serializer.toJson<String>(timestamp),
      'inputBy': serializer.toJson<String>(inputBy),
      'timestampUpdate': serializer.toJson<String>(timestampUpdate),
      'statusTextWa': serializer.toJson<String>(statusTextWa),
    };
  }

  GlobalHeader copyWith(
          {Value<int?> no = const Value.absent(),
          String? kodeHeader,
          String? ulp,
          String? hari,
          String? tanggal,
          String? tim,
          String? subTim,
          String? koordinatAwal,
          String? koordinatAkhir,
          String? kmAwal,
          String? kmAkhir,
          String? kendala,
          String? waText,
          String? timestamp,
          String? inputBy,
          String? timestampUpdate,
          String? statusTextWa}) =>
      GlobalHeader(
        no: no.present ? no.value : this.no,
        kodeHeader: kodeHeader ?? this.kodeHeader,
        ulp: ulp ?? this.ulp,
        hari: hari ?? this.hari,
        tanggal: tanggal ?? this.tanggal,
        tim: tim ?? this.tim,
        subTim: subTim ?? this.subTim,
        koordinatAwal: koordinatAwal ?? this.koordinatAwal,
        koordinatAkhir: koordinatAkhir ?? this.koordinatAkhir,
        kmAwal: kmAwal ?? this.kmAwal,
        kmAkhir: kmAkhir ?? this.kmAkhir,
        kendala: kendala ?? this.kendala,
        waText: waText ?? this.waText,
        timestamp: timestamp ?? this.timestamp,
        inputBy: inputBy ?? this.inputBy,
        timestampUpdate: timestampUpdate ?? this.timestampUpdate,
        statusTextWa: statusTextWa ?? this.statusTextWa,
      );
  GlobalHeader copyWithCompanion(GlobalHeadersCompanion data) {
    return GlobalHeader(
      no: data.no.present ? data.no.value : this.no,
      kodeHeader:
          data.kodeHeader.present ? data.kodeHeader.value : this.kodeHeader,
      ulp: data.ulp.present ? data.ulp.value : this.ulp,
      hari: data.hari.present ? data.hari.value : this.hari,
      tanggal: data.tanggal.present ? data.tanggal.value : this.tanggal,
      tim: data.tim.present ? data.tim.value : this.tim,
      subTim: data.subTim.present ? data.subTim.value : this.subTim,
      koordinatAwal: data.koordinatAwal.present
          ? data.koordinatAwal.value
          : this.koordinatAwal,
      koordinatAkhir: data.koordinatAkhir.present
          ? data.koordinatAkhir.value
          : this.koordinatAkhir,
      kmAwal: data.kmAwal.present ? data.kmAwal.value : this.kmAwal,
      kmAkhir: data.kmAkhir.present ? data.kmAkhir.value : this.kmAkhir,
      kendala: data.kendala.present ? data.kendala.value : this.kendala,
      waText: data.waText.present ? data.waText.value : this.waText,
      timestamp: data.timestamp.present ? data.timestamp.value : this.timestamp,
      inputBy: data.inputBy.present ? data.inputBy.value : this.inputBy,
      timestampUpdate: data.timestampUpdate.present
          ? data.timestampUpdate.value
          : this.timestampUpdate,
      statusTextWa: data.statusTextWa.present
          ? data.statusTextWa.value
          : this.statusTextWa,
    );
  }

  @override
  String toString() {
    return (StringBuffer('GlobalHeader(')
          ..write('no: $no, ')
          ..write('kodeHeader: $kodeHeader, ')
          ..write('ulp: $ulp, ')
          ..write('hari: $hari, ')
          ..write('tanggal: $tanggal, ')
          ..write('tim: $tim, ')
          ..write('subTim: $subTim, ')
          ..write('koordinatAwal: $koordinatAwal, ')
          ..write('koordinatAkhir: $koordinatAkhir, ')
          ..write('kmAwal: $kmAwal, ')
          ..write('kmAkhir: $kmAkhir, ')
          ..write('kendala: $kendala, ')
          ..write('waText: $waText, ')
          ..write('timestamp: $timestamp, ')
          ..write('inputBy: $inputBy, ')
          ..write('timestampUpdate: $timestampUpdate, ')
          ..write('statusTextWa: $statusTextWa')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      no,
      kodeHeader,
      ulp,
      hari,
      tanggal,
      tim,
      subTim,
      koordinatAwal,
      koordinatAkhir,
      kmAwal,
      kmAkhir,
      kendala,
      waText,
      timestamp,
      inputBy,
      timestampUpdate,
      statusTextWa);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GlobalHeader &&
          other.no == this.no &&
          other.kodeHeader == this.kodeHeader &&
          other.ulp == this.ulp &&
          other.hari == this.hari &&
          other.tanggal == this.tanggal &&
          other.tim == this.tim &&
          other.subTim == this.subTim &&
          other.koordinatAwal == this.koordinatAwal &&
          other.koordinatAkhir == this.koordinatAkhir &&
          other.kmAwal == this.kmAwal &&
          other.kmAkhir == this.kmAkhir &&
          other.kendala == this.kendala &&
          other.waText == this.waText &&
          other.timestamp == this.timestamp &&
          other.inputBy == this.inputBy &&
          other.timestampUpdate == this.timestampUpdate &&
          other.statusTextWa == this.statusTextWa);
}

class GlobalHeadersCompanion extends UpdateCompanion<GlobalHeader> {
  final Value<int?> no;
  final Value<String> kodeHeader;
  final Value<String> ulp;
  final Value<String> hari;
  final Value<String> tanggal;
  final Value<String> tim;
  final Value<String> subTim;
  final Value<String> koordinatAwal;
  final Value<String> koordinatAkhir;
  final Value<String> kmAwal;
  final Value<String> kmAkhir;
  final Value<String> kendala;
  final Value<String> waText;
  final Value<String> timestamp;
  final Value<String> inputBy;
  final Value<String> timestampUpdate;
  final Value<String> statusTextWa;
  final Value<int> rowid;
  const GlobalHeadersCompanion({
    this.no = const Value.absent(),
    this.kodeHeader = const Value.absent(),
    this.ulp = const Value.absent(),
    this.hari = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.tim = const Value.absent(),
    this.subTim = const Value.absent(),
    this.koordinatAwal = const Value.absent(),
    this.koordinatAkhir = const Value.absent(),
    this.kmAwal = const Value.absent(),
    this.kmAkhir = const Value.absent(),
    this.kendala = const Value.absent(),
    this.waText = const Value.absent(),
    this.timestamp = const Value.absent(),
    this.inputBy = const Value.absent(),
    this.timestampUpdate = const Value.absent(),
    this.statusTextWa = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GlobalHeadersCompanion.insert({
    this.no = const Value.absent(),
    required String kodeHeader,
    this.ulp = const Value.absent(),
    this.hari = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.tim = const Value.absent(),
    this.subTim = const Value.absent(),
    this.koordinatAwal = const Value.absent(),
    this.koordinatAkhir = const Value.absent(),
    this.kmAwal = const Value.absent(),
    this.kmAkhir = const Value.absent(),
    this.kendala = const Value.absent(),
    this.waText = const Value.absent(),
    this.timestamp = const Value.absent(),
    this.inputBy = const Value.absent(),
    this.timestampUpdate = const Value.absent(),
    this.statusTextWa = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : kodeHeader = Value(kodeHeader);
  static Insertable<GlobalHeader> custom({
    Expression<int>? no,
    Expression<String>? kodeHeader,
    Expression<String>? ulp,
    Expression<String>? hari,
    Expression<String>? tanggal,
    Expression<String>? tim,
    Expression<String>? subTim,
    Expression<String>? koordinatAwal,
    Expression<String>? koordinatAkhir,
    Expression<String>? kmAwal,
    Expression<String>? kmAkhir,
    Expression<String>? kendala,
    Expression<String>? waText,
    Expression<String>? timestamp,
    Expression<String>? inputBy,
    Expression<String>? timestampUpdate,
    Expression<String>? statusTextWa,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (no != null) 'no': no,
      if (kodeHeader != null) 'kode_header': kodeHeader,
      if (ulp != null) 'ulp': ulp,
      if (hari != null) 'hari': hari,
      if (tanggal != null) 'tanggal': tanggal,
      if (tim != null) 'tim': tim,
      if (subTim != null) 'sub_tim': subTim,
      if (koordinatAwal != null) 'koordinat_awal': koordinatAwal,
      if (koordinatAkhir != null) 'koordinat_akhir': koordinatAkhir,
      if (kmAwal != null) 'km_awal': kmAwal,
      if (kmAkhir != null) 'km_akhir': kmAkhir,
      if (kendala != null) 'kendala': kendala,
      if (waText != null) 'wa_text': waText,
      if (timestamp != null) 'timestamp': timestamp,
      if (inputBy != null) 'input_by': inputBy,
      if (timestampUpdate != null) 'timestamp_update': timestampUpdate,
      if (statusTextWa != null) 'status_text_wa': statusTextWa,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GlobalHeadersCompanion copyWith(
      {Value<int?>? no,
      Value<String>? kodeHeader,
      Value<String>? ulp,
      Value<String>? hari,
      Value<String>? tanggal,
      Value<String>? tim,
      Value<String>? subTim,
      Value<String>? koordinatAwal,
      Value<String>? koordinatAkhir,
      Value<String>? kmAwal,
      Value<String>? kmAkhir,
      Value<String>? kendala,
      Value<String>? waText,
      Value<String>? timestamp,
      Value<String>? inputBy,
      Value<String>? timestampUpdate,
      Value<String>? statusTextWa,
      Value<int>? rowid}) {
    return GlobalHeadersCompanion(
      no: no ?? this.no,
      kodeHeader: kodeHeader ?? this.kodeHeader,
      ulp: ulp ?? this.ulp,
      hari: hari ?? this.hari,
      tanggal: tanggal ?? this.tanggal,
      tim: tim ?? this.tim,
      subTim: subTim ?? this.subTim,
      koordinatAwal: koordinatAwal ?? this.koordinatAwal,
      koordinatAkhir: koordinatAkhir ?? this.koordinatAkhir,
      kmAwal: kmAwal ?? this.kmAwal,
      kmAkhir: kmAkhir ?? this.kmAkhir,
      kendala: kendala ?? this.kendala,
      waText: waText ?? this.waText,
      timestamp: timestamp ?? this.timestamp,
      inputBy: inputBy ?? this.inputBy,
      timestampUpdate: timestampUpdate ?? this.timestampUpdate,
      statusTextWa: statusTextWa ?? this.statusTextWa,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (no.present) {
      map['no'] = Variable<int>(no.value);
    }
    if (kodeHeader.present) {
      map['kode_header'] = Variable<String>(kodeHeader.value);
    }
    if (ulp.present) {
      map['ulp'] = Variable<String>(ulp.value);
    }
    if (hari.present) {
      map['hari'] = Variable<String>(hari.value);
    }
    if (tanggal.present) {
      map['tanggal'] = Variable<String>(tanggal.value);
    }
    if (tim.present) {
      map['tim'] = Variable<String>(tim.value);
    }
    if (subTim.present) {
      map['sub_tim'] = Variable<String>(subTim.value);
    }
    if (koordinatAwal.present) {
      map['koordinat_awal'] = Variable<String>(koordinatAwal.value);
    }
    if (koordinatAkhir.present) {
      map['koordinat_akhir'] = Variable<String>(koordinatAkhir.value);
    }
    if (kmAwal.present) {
      map['km_awal'] = Variable<String>(kmAwal.value);
    }
    if (kmAkhir.present) {
      map['km_akhir'] = Variable<String>(kmAkhir.value);
    }
    if (kendala.present) {
      map['kendala'] = Variable<String>(kendala.value);
    }
    if (waText.present) {
      map['wa_text'] = Variable<String>(waText.value);
    }
    if (timestamp.present) {
      map['timestamp'] = Variable<String>(timestamp.value);
    }
    if (inputBy.present) {
      map['input_by'] = Variable<String>(inputBy.value);
    }
    if (timestampUpdate.present) {
      map['timestamp_update'] = Variable<String>(timestampUpdate.value);
    }
    if (statusTextWa.present) {
      map['status_text_wa'] = Variable<String>(statusTextWa.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GlobalHeadersCompanion(')
          ..write('no: $no, ')
          ..write('kodeHeader: $kodeHeader, ')
          ..write('ulp: $ulp, ')
          ..write('hari: $hari, ')
          ..write('tanggal: $tanggal, ')
          ..write('tim: $tim, ')
          ..write('subTim: $subTim, ')
          ..write('koordinatAwal: $koordinatAwal, ')
          ..write('koordinatAkhir: $koordinatAkhir, ')
          ..write('kmAwal: $kmAwal, ')
          ..write('kmAkhir: $kmAkhir, ')
          ..write('kendala: $kendala, ')
          ..write('waText: $waText, ')
          ..write('timestamp: $timestamp, ')
          ..write('inputBy: $inputBy, ')
          ..write('timestampUpdate: $timestampUpdate, ')
          ..write('statusTextWa: $statusTextWa, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $MasterPenyulangsTable extends MasterPenyulangs
    with TableInfo<$MasterPenyulangsTable, MasterPenyulang> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MasterPenyulangsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _noMeta = const VerificationMeta('no');
  @override
  late final GeneratedColumn<int> no = GeneratedColumn<int>(
      'no', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _ulpMeta = const VerificationMeta('ulp');
  @override
  late final GeneratedColumn<String> ulp = GeneratedColumn<String>(
      'ulp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _namaPenyulangMeta =
      const VerificationMeta('namaPenyulang');
  @override
  late final GeneratedColumn<String> namaPenyulang = GeneratedColumn<String>(
      'nama_penyulang', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _namaSwitchingMeta =
      const VerificationMeta('namaSwitching');
  @override
  late final GeneratedColumn<String> namaSwitching = GeneratedColumn<String>(
      'nama_switching', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _sectionMeta =
      const VerificationMeta('section');
  @override
  late final GeneratedColumn<String> section = GeneratedColumn<String>(
      'section', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns =>
      [id, no, ulp, namaPenyulang, namaSwitching, section];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'master_penyulang';
  @override
  VerificationContext validateIntegrity(Insertable<MasterPenyulang> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('no')) {
      context.handle(_noMeta, no.isAcceptableOrUnknown(data['no']!, _noMeta));
    }
    if (data.containsKey('ulp')) {
      context.handle(
          _ulpMeta, ulp.isAcceptableOrUnknown(data['ulp']!, _ulpMeta));
    }
    if (data.containsKey('nama_penyulang')) {
      context.handle(
          _namaPenyulangMeta,
          namaPenyulang.isAcceptableOrUnknown(
              data['nama_penyulang']!, _namaPenyulangMeta));
    }
    if (data.containsKey('nama_switching')) {
      context.handle(
          _namaSwitchingMeta,
          namaSwitching.isAcceptableOrUnknown(
              data['nama_switching']!, _namaSwitchingMeta));
    }
    if (data.containsKey('section')) {
      context.handle(_sectionMeta,
          section.isAcceptableOrUnknown(data['section']!, _sectionMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  MasterPenyulang map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MasterPenyulang(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      no: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}no']),
      ulp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ulp'])!,
      namaPenyulang: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}nama_penyulang'])!,
      namaSwitching: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}nama_switching'])!,
      section: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}section'])!,
    );
  }

  @override
  $MasterPenyulangsTable createAlias(String alias) {
    return $MasterPenyulangsTable(attachedDatabase, alias);
  }
}

class MasterPenyulang extends DataClass implements Insertable<MasterPenyulang> {
  /// id lokal (auto-increment; sheet tidak punya kunci unik)
  final int id;

  /// A — No: nomor urut di sheet (bukan kunci)
  final int? no;

  /// B — ULP
  final String ulp;

  /// C — Nama Penyulang (bisa muncul berulang: 1 baris per section)
  final String namaPenyulang;

  /// D — Nama Switching
  final String namaSwitching;

  /// E — Section (label "Induk - Anak" untuk topologi)
  final String section;
  const MasterPenyulang(
      {required this.id,
      this.no,
      required this.ulp,
      required this.namaPenyulang,
      required this.namaSwitching,
      required this.section});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    if (!nullToAbsent || no != null) {
      map['no'] = Variable<int>(no);
    }
    map['ulp'] = Variable<String>(ulp);
    map['nama_penyulang'] = Variable<String>(namaPenyulang);
    map['nama_switching'] = Variable<String>(namaSwitching);
    map['section'] = Variable<String>(section);
    return map;
  }

  MasterPenyulangsCompanion toCompanion(bool nullToAbsent) {
    return MasterPenyulangsCompanion(
      id: Value(id),
      no: no == null && nullToAbsent ? const Value.absent() : Value(no),
      ulp: Value(ulp),
      namaPenyulang: Value(namaPenyulang),
      namaSwitching: Value(namaSwitching),
      section: Value(section),
    );
  }

  factory MasterPenyulang.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MasterPenyulang(
      id: serializer.fromJson<int>(json['id']),
      no: serializer.fromJson<int?>(json['no']),
      ulp: serializer.fromJson<String>(json['ulp']),
      namaPenyulang: serializer.fromJson<String>(json['namaPenyulang']),
      namaSwitching: serializer.fromJson<String>(json['namaSwitching']),
      section: serializer.fromJson<String>(json['section']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'no': serializer.toJson<int?>(no),
      'ulp': serializer.toJson<String>(ulp),
      'namaPenyulang': serializer.toJson<String>(namaPenyulang),
      'namaSwitching': serializer.toJson<String>(namaSwitching),
      'section': serializer.toJson<String>(section),
    };
  }

  MasterPenyulang copyWith(
          {int? id,
          Value<int?> no = const Value.absent(),
          String? ulp,
          String? namaPenyulang,
          String? namaSwitching,
          String? section}) =>
      MasterPenyulang(
        id: id ?? this.id,
        no: no.present ? no.value : this.no,
        ulp: ulp ?? this.ulp,
        namaPenyulang: namaPenyulang ?? this.namaPenyulang,
        namaSwitching: namaSwitching ?? this.namaSwitching,
        section: section ?? this.section,
      );
  MasterPenyulang copyWithCompanion(MasterPenyulangsCompanion data) {
    return MasterPenyulang(
      id: data.id.present ? data.id.value : this.id,
      no: data.no.present ? data.no.value : this.no,
      ulp: data.ulp.present ? data.ulp.value : this.ulp,
      namaPenyulang: data.namaPenyulang.present
          ? data.namaPenyulang.value
          : this.namaPenyulang,
      namaSwitching: data.namaSwitching.present
          ? data.namaSwitching.value
          : this.namaSwitching,
      section: data.section.present ? data.section.value : this.section,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MasterPenyulang(')
          ..write('id: $id, ')
          ..write('no: $no, ')
          ..write('ulp: $ulp, ')
          ..write('namaPenyulang: $namaPenyulang, ')
          ..write('namaSwitching: $namaSwitching, ')
          ..write('section: $section')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, no, ulp, namaPenyulang, namaSwitching, section);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MasterPenyulang &&
          other.id == this.id &&
          other.no == this.no &&
          other.ulp == this.ulp &&
          other.namaPenyulang == this.namaPenyulang &&
          other.namaSwitching == this.namaSwitching &&
          other.section == this.section);
}

class MasterPenyulangsCompanion extends UpdateCompanion<MasterPenyulang> {
  final Value<int> id;
  final Value<int?> no;
  final Value<String> ulp;
  final Value<String> namaPenyulang;
  final Value<String> namaSwitching;
  final Value<String> section;
  const MasterPenyulangsCompanion({
    this.id = const Value.absent(),
    this.no = const Value.absent(),
    this.ulp = const Value.absent(),
    this.namaPenyulang = const Value.absent(),
    this.namaSwitching = const Value.absent(),
    this.section = const Value.absent(),
  });
  MasterPenyulangsCompanion.insert({
    this.id = const Value.absent(),
    this.no = const Value.absent(),
    this.ulp = const Value.absent(),
    this.namaPenyulang = const Value.absent(),
    this.namaSwitching = const Value.absent(),
    this.section = const Value.absent(),
  });
  static Insertable<MasterPenyulang> custom({
    Expression<int>? id,
    Expression<int>? no,
    Expression<String>? ulp,
    Expression<String>? namaPenyulang,
    Expression<String>? namaSwitching,
    Expression<String>? section,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (no != null) 'no': no,
      if (ulp != null) 'ulp': ulp,
      if (namaPenyulang != null) 'nama_penyulang': namaPenyulang,
      if (namaSwitching != null) 'nama_switching': namaSwitching,
      if (section != null) 'section': section,
    });
  }

  MasterPenyulangsCompanion copyWith(
      {Value<int>? id,
      Value<int?>? no,
      Value<String>? ulp,
      Value<String>? namaPenyulang,
      Value<String>? namaSwitching,
      Value<String>? section}) {
    return MasterPenyulangsCompanion(
      id: id ?? this.id,
      no: no ?? this.no,
      ulp: ulp ?? this.ulp,
      namaPenyulang: namaPenyulang ?? this.namaPenyulang,
      namaSwitching: namaSwitching ?? this.namaSwitching,
      section: section ?? this.section,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (no.present) {
      map['no'] = Variable<int>(no.value);
    }
    if (ulp.present) {
      map['ulp'] = Variable<String>(ulp.value);
    }
    if (namaPenyulang.present) {
      map['nama_penyulang'] = Variable<String>(namaPenyulang.value);
    }
    if (namaSwitching.present) {
      map['nama_switching'] = Variable<String>(namaSwitching.value);
    }
    if (section.present) {
      map['section'] = Variable<String>(section.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MasterPenyulangsCompanion(')
          ..write('id: $id, ')
          ..write('no: $no, ')
          ..write('ulp: $ulp, ')
          ..write('namaPenyulang: $namaPenyulang, ')
          ..write('namaSwitching: $namaSwitching, ')
          ..write('section: $section')
          ..write(')'))
        .toString();
  }
}

class $LaporanHariansTable extends LaporanHarians
    with TableInfo<$LaporanHariansTable, LaporanHarian> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LaporanHariansTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _noMeta = const VerificationMeta('no');
  @override
  late final GeneratedColumn<int> no = GeneratedColumn<int>(
      'no', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _tanggalMeta =
      const VerificationMeta('tanggal');
  @override
  late final GeneratedColumn<String> tanggal = GeneratedColumn<String>(
      'tanggal', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _penyulangMeta =
      const VerificationMeta('penyulang');
  @override
  late final GeneratedColumn<String> penyulang = GeneratedColumn<String>(
      'penyulang', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _panjangKmsMeta =
      const VerificationMeta('panjangKms');
  @override
  late final GeneratedColumn<String> panjangKms = GeneratedColumn<String>(
      'panjang_kms', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _temuanMeta = const VerificationMeta('temuan');
  @override
  late final GeneratedColumn<String> temuan = GeneratedColumn<String>(
      'temuan', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _eksekusiMeta =
      const VerificationMeta('eksekusi');
  @override
  late final GeneratedColumn<String> eksekusi = GeneratedColumn<String>(
      'eksekusi', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _laporanUp3Meta =
      const VerificationMeta('laporanUp3');
  @override
  late final GeneratedColumn<String> laporanUp3 = GeneratedColumn<String>(
      'laporan_up3', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _laporanUiwMeta =
      const VerificationMeta('laporanUiw');
  @override
  late final GeneratedColumn<String> laporanUiw = GeneratedColumn<String>(
      'laporan_uiw', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns => [
        no,
        tanggal,
        penyulang,
        panjangKms,
        temuan,
        eksekusi,
        laporanUp3,
        laporanUiw
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'laporan_harian';
  @override
  VerificationContext validateIntegrity(Insertable<LaporanHarian> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('no')) {
      context.handle(_noMeta, no.isAcceptableOrUnknown(data['no']!, _noMeta));
    }
    if (data.containsKey('tanggal')) {
      context.handle(_tanggalMeta,
          tanggal.isAcceptableOrUnknown(data['tanggal']!, _tanggalMeta));
    } else if (isInserting) {
      context.missing(_tanggalMeta);
    }
    if (data.containsKey('penyulang')) {
      context.handle(_penyulangMeta,
          penyulang.isAcceptableOrUnknown(data['penyulang']!, _penyulangMeta));
    }
    if (data.containsKey('panjang_kms')) {
      context.handle(
          _panjangKmsMeta,
          panjangKms.isAcceptableOrUnknown(
              data['panjang_kms']!, _panjangKmsMeta));
    }
    if (data.containsKey('temuan')) {
      context.handle(_temuanMeta,
          temuan.isAcceptableOrUnknown(data['temuan']!, _temuanMeta));
    }
    if (data.containsKey('eksekusi')) {
      context.handle(_eksekusiMeta,
          eksekusi.isAcceptableOrUnknown(data['eksekusi']!, _eksekusiMeta));
    }
    if (data.containsKey('laporan_up3')) {
      context.handle(
          _laporanUp3Meta,
          laporanUp3.isAcceptableOrUnknown(
              data['laporan_up3']!, _laporanUp3Meta));
    }
    if (data.containsKey('laporan_uiw')) {
      context.handle(
          _laporanUiwMeta,
          laporanUiw.isAcceptableOrUnknown(
              data['laporan_uiw']!, _laporanUiwMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {tanggal};
  @override
  LaporanHarian map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LaporanHarian(
      no: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}no']),
      tanggal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tanggal'])!,
      penyulang: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}penyulang'])!,
      panjangKms: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}panjang_kms'])!,
      temuan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}temuan'])!,
      eksekusi: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}eksekusi'])!,
      laporanUp3: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}laporan_up3'])!,
      laporanUiw: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}laporan_uiw'])!,
    );
  }

  @override
  $LaporanHariansTable createAlias(String alias) {
    return $LaporanHariansTable(attachedDatabase, alias);
  }
}

class LaporanHarian extends DataClass implements Insertable<LaporanHarian> {
  /// A — No: nomor urut di sheet (bukan kunci)
  final int? no;

  /// B — Tanggal, TEXT ISO "yyyy-MM-dd" (kunci utama)
  final String tanggal;

  /// C — Penyulang (input manual C4A)
  final String penyulang;

  /// D — Panjang kmS Inspeksi (teks gaya Indonesia, mis. "4,1")
  final String panjangKms;

  /// E — Temuan (input manual C4A)
  final String temuan;

  /// F — Eksekusi (input manual C4A)
  final String eksekusi;

  /// G — Laporan UP3 (teks WA hasil generate server; panjang)
  final String laporanUp3;

  /// H — Laporan UIW (teks WA hasil generate server; panjang)
  final String laporanUiw;
  const LaporanHarian(
      {this.no,
      required this.tanggal,
      required this.penyulang,
      required this.panjangKms,
      required this.temuan,
      required this.eksekusi,
      required this.laporanUp3,
      required this.laporanUiw});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (!nullToAbsent || no != null) {
      map['no'] = Variable<int>(no);
    }
    map['tanggal'] = Variable<String>(tanggal);
    map['penyulang'] = Variable<String>(penyulang);
    map['panjang_kms'] = Variable<String>(panjangKms);
    map['temuan'] = Variable<String>(temuan);
    map['eksekusi'] = Variable<String>(eksekusi);
    map['laporan_up3'] = Variable<String>(laporanUp3);
    map['laporan_uiw'] = Variable<String>(laporanUiw);
    return map;
  }

  LaporanHariansCompanion toCompanion(bool nullToAbsent) {
    return LaporanHariansCompanion(
      no: no == null && nullToAbsent ? const Value.absent() : Value(no),
      tanggal: Value(tanggal),
      penyulang: Value(penyulang),
      panjangKms: Value(panjangKms),
      temuan: Value(temuan),
      eksekusi: Value(eksekusi),
      laporanUp3: Value(laporanUp3),
      laporanUiw: Value(laporanUiw),
    );
  }

  factory LaporanHarian.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LaporanHarian(
      no: serializer.fromJson<int?>(json['no']),
      tanggal: serializer.fromJson<String>(json['tanggal']),
      penyulang: serializer.fromJson<String>(json['penyulang']),
      panjangKms: serializer.fromJson<String>(json['panjangKms']),
      temuan: serializer.fromJson<String>(json['temuan']),
      eksekusi: serializer.fromJson<String>(json['eksekusi']),
      laporanUp3: serializer.fromJson<String>(json['laporanUp3']),
      laporanUiw: serializer.fromJson<String>(json['laporanUiw']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'no': serializer.toJson<int?>(no),
      'tanggal': serializer.toJson<String>(tanggal),
      'penyulang': serializer.toJson<String>(penyulang),
      'panjangKms': serializer.toJson<String>(panjangKms),
      'temuan': serializer.toJson<String>(temuan),
      'eksekusi': serializer.toJson<String>(eksekusi),
      'laporanUp3': serializer.toJson<String>(laporanUp3),
      'laporanUiw': serializer.toJson<String>(laporanUiw),
    };
  }

  LaporanHarian copyWith(
          {Value<int?> no = const Value.absent(),
          String? tanggal,
          String? penyulang,
          String? panjangKms,
          String? temuan,
          String? eksekusi,
          String? laporanUp3,
          String? laporanUiw}) =>
      LaporanHarian(
        no: no.present ? no.value : this.no,
        tanggal: tanggal ?? this.tanggal,
        penyulang: penyulang ?? this.penyulang,
        panjangKms: panjangKms ?? this.panjangKms,
        temuan: temuan ?? this.temuan,
        eksekusi: eksekusi ?? this.eksekusi,
        laporanUp3: laporanUp3 ?? this.laporanUp3,
        laporanUiw: laporanUiw ?? this.laporanUiw,
      );
  LaporanHarian copyWithCompanion(LaporanHariansCompanion data) {
    return LaporanHarian(
      no: data.no.present ? data.no.value : this.no,
      tanggal: data.tanggal.present ? data.tanggal.value : this.tanggal,
      penyulang: data.penyulang.present ? data.penyulang.value : this.penyulang,
      panjangKms:
          data.panjangKms.present ? data.panjangKms.value : this.panjangKms,
      temuan: data.temuan.present ? data.temuan.value : this.temuan,
      eksekusi: data.eksekusi.present ? data.eksekusi.value : this.eksekusi,
      laporanUp3:
          data.laporanUp3.present ? data.laporanUp3.value : this.laporanUp3,
      laporanUiw:
          data.laporanUiw.present ? data.laporanUiw.value : this.laporanUiw,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LaporanHarian(')
          ..write('no: $no, ')
          ..write('tanggal: $tanggal, ')
          ..write('penyulang: $penyulang, ')
          ..write('panjangKms: $panjangKms, ')
          ..write('temuan: $temuan, ')
          ..write('eksekusi: $eksekusi, ')
          ..write('laporanUp3: $laporanUp3, ')
          ..write('laporanUiw: $laporanUiw')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(no, tanggal, penyulang, panjangKms, temuan,
      eksekusi, laporanUp3, laporanUiw);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LaporanHarian &&
          other.no == this.no &&
          other.tanggal == this.tanggal &&
          other.penyulang == this.penyulang &&
          other.panjangKms == this.panjangKms &&
          other.temuan == this.temuan &&
          other.eksekusi == this.eksekusi &&
          other.laporanUp3 == this.laporanUp3 &&
          other.laporanUiw == this.laporanUiw);
}

class LaporanHariansCompanion extends UpdateCompanion<LaporanHarian> {
  final Value<int?> no;
  final Value<String> tanggal;
  final Value<String> penyulang;
  final Value<String> panjangKms;
  final Value<String> temuan;
  final Value<String> eksekusi;
  final Value<String> laporanUp3;
  final Value<String> laporanUiw;
  final Value<int> rowid;
  const LaporanHariansCompanion({
    this.no = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.penyulang = const Value.absent(),
    this.panjangKms = const Value.absent(),
    this.temuan = const Value.absent(),
    this.eksekusi = const Value.absent(),
    this.laporanUp3 = const Value.absent(),
    this.laporanUiw = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LaporanHariansCompanion.insert({
    this.no = const Value.absent(),
    required String tanggal,
    this.penyulang = const Value.absent(),
    this.panjangKms = const Value.absent(),
    this.temuan = const Value.absent(),
    this.eksekusi = const Value.absent(),
    this.laporanUp3 = const Value.absent(),
    this.laporanUiw = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : tanggal = Value(tanggal);
  static Insertable<LaporanHarian> custom({
    Expression<int>? no,
    Expression<String>? tanggal,
    Expression<String>? penyulang,
    Expression<String>? panjangKms,
    Expression<String>? temuan,
    Expression<String>? eksekusi,
    Expression<String>? laporanUp3,
    Expression<String>? laporanUiw,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (no != null) 'no': no,
      if (tanggal != null) 'tanggal': tanggal,
      if (penyulang != null) 'penyulang': penyulang,
      if (panjangKms != null) 'panjang_kms': panjangKms,
      if (temuan != null) 'temuan': temuan,
      if (eksekusi != null) 'eksekusi': eksekusi,
      if (laporanUp3 != null) 'laporan_up3': laporanUp3,
      if (laporanUiw != null) 'laporan_uiw': laporanUiw,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LaporanHariansCompanion copyWith(
      {Value<int?>? no,
      Value<String>? tanggal,
      Value<String>? penyulang,
      Value<String>? panjangKms,
      Value<String>? temuan,
      Value<String>? eksekusi,
      Value<String>? laporanUp3,
      Value<String>? laporanUiw,
      Value<int>? rowid}) {
    return LaporanHariansCompanion(
      no: no ?? this.no,
      tanggal: tanggal ?? this.tanggal,
      penyulang: penyulang ?? this.penyulang,
      panjangKms: panjangKms ?? this.panjangKms,
      temuan: temuan ?? this.temuan,
      eksekusi: eksekusi ?? this.eksekusi,
      laporanUp3: laporanUp3 ?? this.laporanUp3,
      laporanUiw: laporanUiw ?? this.laporanUiw,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (no.present) {
      map['no'] = Variable<int>(no.value);
    }
    if (tanggal.present) {
      map['tanggal'] = Variable<String>(tanggal.value);
    }
    if (penyulang.present) {
      map['penyulang'] = Variable<String>(penyulang.value);
    }
    if (panjangKms.present) {
      map['panjang_kms'] = Variable<String>(panjangKms.value);
    }
    if (temuan.present) {
      map['temuan'] = Variable<String>(temuan.value);
    }
    if (eksekusi.present) {
      map['eksekusi'] = Variable<String>(eksekusi.value);
    }
    if (laporanUp3.present) {
      map['laporan_up3'] = Variable<String>(laporanUp3.value);
    }
    if (laporanUiw.present) {
      map['laporan_uiw'] = Variable<String>(laporanUiw.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LaporanHariansCompanion(')
          ..write('no: $no, ')
          ..write('tanggal: $tanggal, ')
          ..write('penyulang: $penyulang, ')
          ..write('panjangKms: $panjangKms, ')
          ..write('temuan: $temuan, ')
          ..write('eksekusi: $eksekusi, ')
          ..write('laporanUp3: $laporanUp3, ')
          ..write('laporanUiw: $laporanUiw, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncInfosTable extends SyncInfos
    with TableInfo<$SyncInfosTable, SyncInfo> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncInfosTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
      'key', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _lastSyncAtMeta =
      const VerificationMeta('lastSyncAt');
  @override
  late final GeneratedColumn<String> lastSyncAt = GeneratedColumn<String>(
      'last_sync_at', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _jumlahDataMeta =
      const VerificationMeta('jumlahData');
  @override
  late final GeneratedColumn<int> jumlahData = GeneratedColumn<int>(
      'jumlah_data', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _keteranganMeta =
      const VerificationMeta('keterangan');
  @override
  late final GeneratedColumn<String> keterangan = GeneratedColumn<String>(
      'keterangan', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns =>
      [key, lastSyncAt, jumlahData, keterangan];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_info';
  @override
  VerificationContext validateIntegrity(Insertable<SyncInfo> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
          _keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('last_sync_at')) {
      context.handle(
          _lastSyncAtMeta,
          lastSyncAt.isAcceptableOrUnknown(
              data['last_sync_at']!, _lastSyncAtMeta));
    }
    if (data.containsKey('jumlah_data')) {
      context.handle(
          _jumlahDataMeta,
          jumlahData.isAcceptableOrUnknown(
              data['jumlah_data']!, _jumlahDataMeta));
    }
    if (data.containsKey('keterangan')) {
      context.handle(
          _keteranganMeta,
          keterangan.isAcceptableOrUnknown(
              data['keterangan']!, _keteranganMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  SyncInfo map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncInfo(
      key: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      lastSyncAt: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_sync_at'])!,
      jumlahData: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}jumlah_data'])!,
      keterangan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}keterangan'])!,
    );
  }

  @override
  $SyncInfosTable createAlias(String alias) {
    return $SyncInfosTable(attachedDatabase, alias);
  }
}

class SyncInfo extends DataClass implements Insertable<SyncInfo> {
  /// Nama modul/kunci: 'masterData', 'laporanTeknik', 'perangkatId', dst
  final String key;

  /// ISO datetime terakhir sinkron ('' = belum pernah)
  final String lastSyncAt;

  /// Jumlah data hasil sinkron terakhir
  final int jumlahData;

  /// Catatan/nilai bebas (mis. nilai perangkatId disimpan di kolom ini)
  final String keterangan;
  const SyncInfo(
      {required this.key,
      required this.lastSyncAt,
      required this.jumlahData,
      required this.keterangan});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['last_sync_at'] = Variable<String>(lastSyncAt);
    map['jumlah_data'] = Variable<int>(jumlahData);
    map['keterangan'] = Variable<String>(keterangan);
    return map;
  }

  SyncInfosCompanion toCompanion(bool nullToAbsent) {
    return SyncInfosCompanion(
      key: Value(key),
      lastSyncAt: Value(lastSyncAt),
      jumlahData: Value(jumlahData),
      keterangan: Value(keterangan),
    );
  }

  factory SyncInfo.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncInfo(
      key: serializer.fromJson<String>(json['key']),
      lastSyncAt: serializer.fromJson<String>(json['lastSyncAt']),
      jumlahData: serializer.fromJson<int>(json['jumlahData']),
      keterangan: serializer.fromJson<String>(json['keterangan']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'lastSyncAt': serializer.toJson<String>(lastSyncAt),
      'jumlahData': serializer.toJson<int>(jumlahData),
      'keterangan': serializer.toJson<String>(keterangan),
    };
  }

  SyncInfo copyWith(
          {String? key,
          String? lastSyncAt,
          int? jumlahData,
          String? keterangan}) =>
      SyncInfo(
        key: key ?? this.key,
        lastSyncAt: lastSyncAt ?? this.lastSyncAt,
        jumlahData: jumlahData ?? this.jumlahData,
        keterangan: keterangan ?? this.keterangan,
      );
  SyncInfo copyWithCompanion(SyncInfosCompanion data) {
    return SyncInfo(
      key: data.key.present ? data.key.value : this.key,
      lastSyncAt:
          data.lastSyncAt.present ? data.lastSyncAt.value : this.lastSyncAt,
      jumlahData:
          data.jumlahData.present ? data.jumlahData.value : this.jumlahData,
      keterangan:
          data.keterangan.present ? data.keterangan.value : this.keterangan,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncInfo(')
          ..write('key: $key, ')
          ..write('lastSyncAt: $lastSyncAt, ')
          ..write('jumlahData: $jumlahData, ')
          ..write('keterangan: $keterangan')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, lastSyncAt, jumlahData, keterangan);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncInfo &&
          other.key == this.key &&
          other.lastSyncAt == this.lastSyncAt &&
          other.jumlahData == this.jumlahData &&
          other.keterangan == this.keterangan);
}

class SyncInfosCompanion extends UpdateCompanion<SyncInfo> {
  final Value<String> key;
  final Value<String> lastSyncAt;
  final Value<int> jumlahData;
  final Value<String> keterangan;
  final Value<int> rowid;
  const SyncInfosCompanion({
    this.key = const Value.absent(),
    this.lastSyncAt = const Value.absent(),
    this.jumlahData = const Value.absent(),
    this.keterangan = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SyncInfosCompanion.insert({
    required String key,
    this.lastSyncAt = const Value.absent(),
    this.jumlahData = const Value.absent(),
    this.keterangan = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : key = Value(key);
  static Insertable<SyncInfo> custom({
    Expression<String>? key,
    Expression<String>? lastSyncAt,
    Expression<int>? jumlahData,
    Expression<String>? keterangan,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (lastSyncAt != null) 'last_sync_at': lastSyncAt,
      if (jumlahData != null) 'jumlah_data': jumlahData,
      if (keterangan != null) 'keterangan': keterangan,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SyncInfosCompanion copyWith(
      {Value<String>? key,
      Value<String>? lastSyncAt,
      Value<int>? jumlahData,
      Value<String>? keterangan,
      Value<int>? rowid}) {
    return SyncInfosCompanion(
      key: key ?? this.key,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      jumlahData: jumlahData ?? this.jumlahData,
      keterangan: keterangan ?? this.keterangan,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (lastSyncAt.present) {
      map['last_sync_at'] = Variable<String>(lastSyncAt.value);
    }
    if (jumlahData.present) {
      map['jumlah_data'] = Variable<int>(jumlahData.value);
    }
    if (keterangan.present) {
      map['keterangan'] = Variable<String>(keterangan.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncInfosCompanion(')
          ..write('key: $key, ')
          ..write('lastSyncAt: $lastSyncAt, ')
          ..write('jumlahData: $jumlahData, ')
          ..write('keterangan: $keterangan, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $P0LokalsTable extends P0Lokals with TableInfo<$P0LokalsTable, P0Lokal> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $P0LokalsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _kodeP0Meta = const VerificationMeta('kodeP0');
  @override
  late final GeneratedColumn<String> kodeP0 = GeneratedColumn<String>(
      'kode_p0', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _ulpMeta = const VerificationMeta('ulp');
  @override
  late final GeneratedColumn<String> ulp = GeneratedColumn<String>(
      'ulp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tanggalMeta =
      const VerificationMeta('tanggal');
  @override
  late final GeneratedColumn<String> tanggal = GeneratedColumn<String>(
      'tanggal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _statusServerMeta =
      const VerificationMeta('statusServer');
  @override
  late final GeneratedColumn<String> statusServer = GeneratedColumn<String>(
      'status_server', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('Menunggu'));
  static const VerificationMeta _dataJsonMeta =
      const VerificationMeta('dataJson');
  @override
  late final GeneratedColumn<String> dataJson = GeneratedColumn<String>(
      'data_json', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('{}'));
  static const VerificationMeta _diambilPadaMeta =
      const VerificationMeta('diambilPada');
  @override
  late final GeneratedColumn<String> diambilPada = GeneratedColumn<String>(
      'diambil_pada', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns =>
      [kodeP0, ulp, tanggal, statusServer, dataJson, diambilPada];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'p0_lokal';
  @override
  VerificationContext validateIntegrity(Insertable<P0Lokal> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('kode_p0')) {
      context.handle(_kodeP0Meta,
          kodeP0.isAcceptableOrUnknown(data['kode_p0']!, _kodeP0Meta));
    } else if (isInserting) {
      context.missing(_kodeP0Meta);
    }
    if (data.containsKey('ulp')) {
      context.handle(
          _ulpMeta, ulp.isAcceptableOrUnknown(data['ulp']!, _ulpMeta));
    }
    if (data.containsKey('tanggal')) {
      context.handle(_tanggalMeta,
          tanggal.isAcceptableOrUnknown(data['tanggal']!, _tanggalMeta));
    }
    if (data.containsKey('status_server')) {
      context.handle(
          _statusServerMeta,
          statusServer.isAcceptableOrUnknown(
              data['status_server']!, _statusServerMeta));
    }
    if (data.containsKey('data_json')) {
      context.handle(_dataJsonMeta,
          dataJson.isAcceptableOrUnknown(data['data_json']!, _dataJsonMeta));
    }
    if (data.containsKey('diambil_pada')) {
      context.handle(
          _diambilPadaMeta,
          diambilPada.isAcceptableOrUnknown(
              data['diambil_pada']!, _diambilPadaMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {kodeP0};
  @override
  P0Lokal map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return P0Lokal(
      kodeP0: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kode_p0'])!,
      ulp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ulp'])!,
      tanggal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tanggal'])!,
      statusServer: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status_server'])!,
      dataJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}data_json'])!,
      diambilPada: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}diambil_pada'])!,
    );
  }

  @override
  $P0LokalsTable createAlias(String alias) {
    return $P0LokalsTable(attachedDatabase, alias);
  }
}

class P0Lokal extends DataClass implements Insertable<P0Lokal> {
  /// Kode P0 — kunci utama, sama dengan kolom Kode P0 di sheet.
  final String kodeP0;

  /// ULP pemilik baris (filter daftar).
  final String ulp;

  /// Tanggal pekerjaan, TEXT ISO "yyyy-MM-dd" (filter daftar).
  final String tanggal;

  /// Status MENURUT SERVER: Menunggu / Approved / Rejected.
  /// Keputusan yang belum terkirim TIDAK menimpa kolom ini — status lokal
  /// dibaca dari p0_outbox agar keduanya bisa dibandingkan.
  final String statusServer;

  /// Balasan server untuk kartu ini, utuh, hasil jsonEncode.
  final String dataJson;

  /// ISO datetime kapan baris ini ditarik dari server.
  final String diambilPada;
  const P0Lokal(
      {required this.kodeP0,
      required this.ulp,
      required this.tanggal,
      required this.statusServer,
      required this.dataJson,
      required this.diambilPada});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['kode_p0'] = Variable<String>(kodeP0);
    map['ulp'] = Variable<String>(ulp);
    map['tanggal'] = Variable<String>(tanggal);
    map['status_server'] = Variable<String>(statusServer);
    map['data_json'] = Variable<String>(dataJson);
    map['diambil_pada'] = Variable<String>(diambilPada);
    return map;
  }

  P0LokalsCompanion toCompanion(bool nullToAbsent) {
    return P0LokalsCompanion(
      kodeP0: Value(kodeP0),
      ulp: Value(ulp),
      tanggal: Value(tanggal),
      statusServer: Value(statusServer),
      dataJson: Value(dataJson),
      diambilPada: Value(diambilPada),
    );
  }

  factory P0Lokal.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return P0Lokal(
      kodeP0: serializer.fromJson<String>(json['kodeP0']),
      ulp: serializer.fromJson<String>(json['ulp']),
      tanggal: serializer.fromJson<String>(json['tanggal']),
      statusServer: serializer.fromJson<String>(json['statusServer']),
      dataJson: serializer.fromJson<String>(json['dataJson']),
      diambilPada: serializer.fromJson<String>(json['diambilPada']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'kodeP0': serializer.toJson<String>(kodeP0),
      'ulp': serializer.toJson<String>(ulp),
      'tanggal': serializer.toJson<String>(tanggal),
      'statusServer': serializer.toJson<String>(statusServer),
      'dataJson': serializer.toJson<String>(dataJson),
      'diambilPada': serializer.toJson<String>(diambilPada),
    };
  }

  P0Lokal copyWith(
          {String? kodeP0,
          String? ulp,
          String? tanggal,
          String? statusServer,
          String? dataJson,
          String? diambilPada}) =>
      P0Lokal(
        kodeP0: kodeP0 ?? this.kodeP0,
        ulp: ulp ?? this.ulp,
        tanggal: tanggal ?? this.tanggal,
        statusServer: statusServer ?? this.statusServer,
        dataJson: dataJson ?? this.dataJson,
        diambilPada: diambilPada ?? this.diambilPada,
      );
  P0Lokal copyWithCompanion(P0LokalsCompanion data) {
    return P0Lokal(
      kodeP0: data.kodeP0.present ? data.kodeP0.value : this.kodeP0,
      ulp: data.ulp.present ? data.ulp.value : this.ulp,
      tanggal: data.tanggal.present ? data.tanggal.value : this.tanggal,
      statusServer: data.statusServer.present
          ? data.statusServer.value
          : this.statusServer,
      dataJson: data.dataJson.present ? data.dataJson.value : this.dataJson,
      diambilPada:
          data.diambilPada.present ? data.diambilPada.value : this.diambilPada,
    );
  }

  @override
  String toString() {
    return (StringBuffer('P0Lokal(')
          ..write('kodeP0: $kodeP0, ')
          ..write('ulp: $ulp, ')
          ..write('tanggal: $tanggal, ')
          ..write('statusServer: $statusServer, ')
          ..write('dataJson: $dataJson, ')
          ..write('diambilPada: $diambilPada')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(kodeP0, ulp, tanggal, statusServer, dataJson, diambilPada);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is P0Lokal &&
          other.kodeP0 == this.kodeP0 &&
          other.ulp == this.ulp &&
          other.tanggal == this.tanggal &&
          other.statusServer == this.statusServer &&
          other.dataJson == this.dataJson &&
          other.diambilPada == this.diambilPada);
}

class P0LokalsCompanion extends UpdateCompanion<P0Lokal> {
  final Value<String> kodeP0;
  final Value<String> ulp;
  final Value<String> tanggal;
  final Value<String> statusServer;
  final Value<String> dataJson;
  final Value<String> diambilPada;
  final Value<int> rowid;
  const P0LokalsCompanion({
    this.kodeP0 = const Value.absent(),
    this.ulp = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.statusServer = const Value.absent(),
    this.dataJson = const Value.absent(),
    this.diambilPada = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  P0LokalsCompanion.insert({
    required String kodeP0,
    this.ulp = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.statusServer = const Value.absent(),
    this.dataJson = const Value.absent(),
    this.diambilPada = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : kodeP0 = Value(kodeP0);
  static Insertable<P0Lokal> custom({
    Expression<String>? kodeP0,
    Expression<String>? ulp,
    Expression<String>? tanggal,
    Expression<String>? statusServer,
    Expression<String>? dataJson,
    Expression<String>? diambilPada,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (kodeP0 != null) 'kode_p0': kodeP0,
      if (ulp != null) 'ulp': ulp,
      if (tanggal != null) 'tanggal': tanggal,
      if (statusServer != null) 'status_server': statusServer,
      if (dataJson != null) 'data_json': dataJson,
      if (diambilPada != null) 'diambil_pada': diambilPada,
      if (rowid != null) 'rowid': rowid,
    });
  }

  P0LokalsCompanion copyWith(
      {Value<String>? kodeP0,
      Value<String>? ulp,
      Value<String>? tanggal,
      Value<String>? statusServer,
      Value<String>? dataJson,
      Value<String>? diambilPada,
      Value<int>? rowid}) {
    return P0LokalsCompanion(
      kodeP0: kodeP0 ?? this.kodeP0,
      ulp: ulp ?? this.ulp,
      tanggal: tanggal ?? this.tanggal,
      statusServer: statusServer ?? this.statusServer,
      dataJson: dataJson ?? this.dataJson,
      diambilPada: diambilPada ?? this.diambilPada,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (kodeP0.present) {
      map['kode_p0'] = Variable<String>(kodeP0.value);
    }
    if (ulp.present) {
      map['ulp'] = Variable<String>(ulp.value);
    }
    if (tanggal.present) {
      map['tanggal'] = Variable<String>(tanggal.value);
    }
    if (statusServer.present) {
      map['status_server'] = Variable<String>(statusServer.value);
    }
    if (dataJson.present) {
      map['data_json'] = Variable<String>(dataJson.value);
    }
    if (diambilPada.present) {
      map['diambil_pada'] = Variable<String>(diambilPada.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('P0LokalsCompanion(')
          ..write('kodeP0: $kodeP0, ')
          ..write('ulp: $ulp, ')
          ..write('tanggal: $tanggal, ')
          ..write('statusServer: $statusServer, ')
          ..write('dataJson: $dataJson, ')
          ..write('diambilPada: $diambilPada, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $P0OutboxesTable extends P0Outboxes
    with TableInfo<$P0OutboxesTable, P0Outbox> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $P0OutboxesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _kodeP0Meta = const VerificationMeta('kodeP0');
  @override
  late final GeneratedColumn<String> kodeP0 = GeneratedColumn<String>(
      'kode_p0', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _keputusanMeta =
      const VerificationMeta('keputusan');
  @override
  late final GeneratedColumn<String> keputusan = GeneratedColumn<String>(
      'keputusan', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _alasanMeta = const VerificationMeta('alasan');
  @override
  late final GeneratedColumn<String> alasan = GeneratedColumn<String>(
      'alasan', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _usernameMeta =
      const VerificationMeta('username');
  @override
  late final GeneratedColumn<String> username = GeneratedColumn<String>(
      'username', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tanggalMeta =
      const VerificationMeta('tanggal');
  @override
  late final GeneratedColumn<String> tanggal = GeneratedColumn<String>(
      'tanggal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _dibuatPadaMeta =
      const VerificationMeta('dibuatPada');
  @override
  late final GeneratedColumn<String> dibuatPada = GeneratedColumn<String>(
      'dibuat_pada', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _percobaanMeta =
      const VerificationMeta('percobaan');
  @override
  late final GeneratedColumn<int> percobaan = GeneratedColumn<int>(
      'percobaan', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _pesanGagalMeta =
      const VerificationMeta('pesanGagal');
  @override
  late final GeneratedColumn<String> pesanGagal = GeneratedColumn<String>(
      'pesan_gagal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns => [
        kodeP0,
        keputusan,
        alasan,
        username,
        tanggal,
        dibuatPada,
        status,
        percobaan,
        pesanGagal
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'p0_outbox';
  @override
  VerificationContext validateIntegrity(Insertable<P0Outbox> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('kode_p0')) {
      context.handle(_kodeP0Meta,
          kodeP0.isAcceptableOrUnknown(data['kode_p0']!, _kodeP0Meta));
    } else if (isInserting) {
      context.missing(_kodeP0Meta);
    }
    if (data.containsKey('keputusan')) {
      context.handle(_keputusanMeta,
          keputusan.isAcceptableOrUnknown(data['keputusan']!, _keputusanMeta));
    } else if (isInserting) {
      context.missing(_keputusanMeta);
    }
    if (data.containsKey('alasan')) {
      context.handle(_alasanMeta,
          alasan.isAcceptableOrUnknown(data['alasan']!, _alasanMeta));
    }
    if (data.containsKey('username')) {
      context.handle(_usernameMeta,
          username.isAcceptableOrUnknown(data['username']!, _usernameMeta));
    }
    if (data.containsKey('tanggal')) {
      context.handle(_tanggalMeta,
          tanggal.isAcceptableOrUnknown(data['tanggal']!, _tanggalMeta));
    }
    if (data.containsKey('dibuat_pada')) {
      context.handle(
          _dibuatPadaMeta,
          dibuatPada.isAcceptableOrUnknown(
              data['dibuat_pada']!, _dibuatPadaMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('percobaan')) {
      context.handle(_percobaanMeta,
          percobaan.isAcceptableOrUnknown(data['percobaan']!, _percobaanMeta));
    }
    if (data.containsKey('pesan_gagal')) {
      context.handle(
          _pesanGagalMeta,
          pesanGagal.isAcceptableOrUnknown(
              data['pesan_gagal']!, _pesanGagalMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {kodeP0};
  @override
  P0Outbox map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return P0Outbox(
      kodeP0: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kode_p0'])!,
      keputusan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}keputusan'])!,
      alasan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}alasan'])!,
      username: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}username'])!,
      tanggal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tanggal'])!,
      dibuatPada: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}dibuat_pada'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      percobaan: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}percobaan'])!,
      pesanGagal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}pesan_gagal'])!,
    );
  }

  @override
  $P0OutboxesTable createAlias(String alias) {
    return $P0OutboxesTable(attachedDatabase, alias);
  }
}

class P0Outbox extends DataClass implements Insertable<P0Outbox> {
  /// Kode P0 yang diputuskan.
  final String kodeP0;

  /// 'Approved' atau 'Rejected' — nilai yang dikirim ke kolom Status Approval.
  final String keputusan;

  /// Alasan penolakan (wajib untuk Rejected, kolom AQ di sheet).
  final String alasan;

  /// Username pemutus (diambil dari sesi login saat keputusan dibuat, BUKAN
  /// saat sync — supaya jejaknya tetap benar walau HP dipakai berganti akun).
  final String username;

  /// Tanggal pekerjaan P0 — dipakai UI untuk mengelompokkan antrean.
  final String tanggal;

  /// ISO datetime saat keputusan dibuat di HP.
  final String dibuatPada;

  /// 'pending' = belum terkirim, 'gagal' = percobaan terakhir ditolak server.
  /// Baris yang sudah 'terkirim' langsung DIHAPUS, jadi nilai itu hampir tidak
  /// pernah tersimpan — tabel ini memang hanya menampung yang belum tuntas.
  final String status;

  /// Berapa kali sudah dicoba kirim (untuk diagnosa di kartu Pengaturan).
  final int percobaan;

  /// Pesan galat percobaan terakhir — ditampilkan apa adanya ke admin.
  final String pesanGagal;
  const P0Outbox(
      {required this.kodeP0,
      required this.keputusan,
      required this.alasan,
      required this.username,
      required this.tanggal,
      required this.dibuatPada,
      required this.status,
      required this.percobaan,
      required this.pesanGagal});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['kode_p0'] = Variable<String>(kodeP0);
    map['keputusan'] = Variable<String>(keputusan);
    map['alasan'] = Variable<String>(alasan);
    map['username'] = Variable<String>(username);
    map['tanggal'] = Variable<String>(tanggal);
    map['dibuat_pada'] = Variable<String>(dibuatPada);
    map['status'] = Variable<String>(status);
    map['percobaan'] = Variable<int>(percobaan);
    map['pesan_gagal'] = Variable<String>(pesanGagal);
    return map;
  }

  P0OutboxesCompanion toCompanion(bool nullToAbsent) {
    return P0OutboxesCompanion(
      kodeP0: Value(kodeP0),
      keputusan: Value(keputusan),
      alasan: Value(alasan),
      username: Value(username),
      tanggal: Value(tanggal),
      dibuatPada: Value(dibuatPada),
      status: Value(status),
      percobaan: Value(percobaan),
      pesanGagal: Value(pesanGagal),
    );
  }

  factory P0Outbox.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return P0Outbox(
      kodeP0: serializer.fromJson<String>(json['kodeP0']),
      keputusan: serializer.fromJson<String>(json['keputusan']),
      alasan: serializer.fromJson<String>(json['alasan']),
      username: serializer.fromJson<String>(json['username']),
      tanggal: serializer.fromJson<String>(json['tanggal']),
      dibuatPada: serializer.fromJson<String>(json['dibuatPada']),
      status: serializer.fromJson<String>(json['status']),
      percobaan: serializer.fromJson<int>(json['percobaan']),
      pesanGagal: serializer.fromJson<String>(json['pesanGagal']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'kodeP0': serializer.toJson<String>(kodeP0),
      'keputusan': serializer.toJson<String>(keputusan),
      'alasan': serializer.toJson<String>(alasan),
      'username': serializer.toJson<String>(username),
      'tanggal': serializer.toJson<String>(tanggal),
      'dibuatPada': serializer.toJson<String>(dibuatPada),
      'status': serializer.toJson<String>(status),
      'percobaan': serializer.toJson<int>(percobaan),
      'pesanGagal': serializer.toJson<String>(pesanGagal),
    };
  }

  P0Outbox copyWith(
          {String? kodeP0,
          String? keputusan,
          String? alasan,
          String? username,
          String? tanggal,
          String? dibuatPada,
          String? status,
          int? percobaan,
          String? pesanGagal}) =>
      P0Outbox(
        kodeP0: kodeP0 ?? this.kodeP0,
        keputusan: keputusan ?? this.keputusan,
        alasan: alasan ?? this.alasan,
        username: username ?? this.username,
        tanggal: tanggal ?? this.tanggal,
        dibuatPada: dibuatPada ?? this.dibuatPada,
        status: status ?? this.status,
        percobaan: percobaan ?? this.percobaan,
        pesanGagal: pesanGagal ?? this.pesanGagal,
      );
  P0Outbox copyWithCompanion(P0OutboxesCompanion data) {
    return P0Outbox(
      kodeP0: data.kodeP0.present ? data.kodeP0.value : this.kodeP0,
      keputusan: data.keputusan.present ? data.keputusan.value : this.keputusan,
      alasan: data.alasan.present ? data.alasan.value : this.alasan,
      username: data.username.present ? data.username.value : this.username,
      tanggal: data.tanggal.present ? data.tanggal.value : this.tanggal,
      dibuatPada:
          data.dibuatPada.present ? data.dibuatPada.value : this.dibuatPada,
      status: data.status.present ? data.status.value : this.status,
      percobaan: data.percobaan.present ? data.percobaan.value : this.percobaan,
      pesanGagal:
          data.pesanGagal.present ? data.pesanGagal.value : this.pesanGagal,
    );
  }

  @override
  String toString() {
    return (StringBuffer('P0Outbox(')
          ..write('kodeP0: $kodeP0, ')
          ..write('keputusan: $keputusan, ')
          ..write('alasan: $alasan, ')
          ..write('username: $username, ')
          ..write('tanggal: $tanggal, ')
          ..write('dibuatPada: $dibuatPada, ')
          ..write('status: $status, ')
          ..write('percobaan: $percobaan, ')
          ..write('pesanGagal: $pesanGagal')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(kodeP0, keputusan, alasan, username, tanggal,
      dibuatPada, status, percobaan, pesanGagal);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is P0Outbox &&
          other.kodeP0 == this.kodeP0 &&
          other.keputusan == this.keputusan &&
          other.alasan == this.alasan &&
          other.username == this.username &&
          other.tanggal == this.tanggal &&
          other.dibuatPada == this.dibuatPada &&
          other.status == this.status &&
          other.percobaan == this.percobaan &&
          other.pesanGagal == this.pesanGagal);
}

class P0OutboxesCompanion extends UpdateCompanion<P0Outbox> {
  final Value<String> kodeP0;
  final Value<String> keputusan;
  final Value<String> alasan;
  final Value<String> username;
  final Value<String> tanggal;
  final Value<String> dibuatPada;
  final Value<String> status;
  final Value<int> percobaan;
  final Value<String> pesanGagal;
  final Value<int> rowid;
  const P0OutboxesCompanion({
    this.kodeP0 = const Value.absent(),
    this.keputusan = const Value.absent(),
    this.alasan = const Value.absent(),
    this.username = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.dibuatPada = const Value.absent(),
    this.status = const Value.absent(),
    this.percobaan = const Value.absent(),
    this.pesanGagal = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  P0OutboxesCompanion.insert({
    required String kodeP0,
    required String keputusan,
    this.alasan = const Value.absent(),
    this.username = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.dibuatPada = const Value.absent(),
    this.status = const Value.absent(),
    this.percobaan = const Value.absent(),
    this.pesanGagal = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : kodeP0 = Value(kodeP0),
        keputusan = Value(keputusan);
  static Insertable<P0Outbox> custom({
    Expression<String>? kodeP0,
    Expression<String>? keputusan,
    Expression<String>? alasan,
    Expression<String>? username,
    Expression<String>? tanggal,
    Expression<String>? dibuatPada,
    Expression<String>? status,
    Expression<int>? percobaan,
    Expression<String>? pesanGagal,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (kodeP0 != null) 'kode_p0': kodeP0,
      if (keputusan != null) 'keputusan': keputusan,
      if (alasan != null) 'alasan': alasan,
      if (username != null) 'username': username,
      if (tanggal != null) 'tanggal': tanggal,
      if (dibuatPada != null) 'dibuat_pada': dibuatPada,
      if (status != null) 'status': status,
      if (percobaan != null) 'percobaan': percobaan,
      if (pesanGagal != null) 'pesan_gagal': pesanGagal,
      if (rowid != null) 'rowid': rowid,
    });
  }

  P0OutboxesCompanion copyWith(
      {Value<String>? kodeP0,
      Value<String>? keputusan,
      Value<String>? alasan,
      Value<String>? username,
      Value<String>? tanggal,
      Value<String>? dibuatPada,
      Value<String>? status,
      Value<int>? percobaan,
      Value<String>? pesanGagal,
      Value<int>? rowid}) {
    return P0OutboxesCompanion(
      kodeP0: kodeP0 ?? this.kodeP0,
      keputusan: keputusan ?? this.keputusan,
      alasan: alasan ?? this.alasan,
      username: username ?? this.username,
      tanggal: tanggal ?? this.tanggal,
      dibuatPada: dibuatPada ?? this.dibuatPada,
      status: status ?? this.status,
      percobaan: percobaan ?? this.percobaan,
      pesanGagal: pesanGagal ?? this.pesanGagal,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (kodeP0.present) {
      map['kode_p0'] = Variable<String>(kodeP0.value);
    }
    if (keputusan.present) {
      map['keputusan'] = Variable<String>(keputusan.value);
    }
    if (alasan.present) {
      map['alasan'] = Variable<String>(alasan.value);
    }
    if (username.present) {
      map['username'] = Variable<String>(username.value);
    }
    if (tanggal.present) {
      map['tanggal'] = Variable<String>(tanggal.value);
    }
    if (dibuatPada.present) {
      map['dibuat_pada'] = Variable<String>(dibuatPada.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (percobaan.present) {
      map['percobaan'] = Variable<int>(percobaan.value);
    }
    if (pesanGagal.present) {
      map['pesan_gagal'] = Variable<String>(pesanGagal.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('P0OutboxesCompanion(')
          ..write('kodeP0: $kodeP0, ')
          ..write('keputusan: $keputusan, ')
          ..write('alasan: $alasan, ')
          ..write('username: $username, ')
          ..write('tanggal: $tanggal, ')
          ..write('dibuatPada: $dibuatPada, ')
          ..write('status: $status, ')
          ..write('percobaan: $percobaan, ')
          ..write('pesanGagal: $pesanGagal, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $MasterGardusTable extends MasterGardus
    with TableInfo<$MasterGardusTable, MasterGardusData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MasterGardusTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _ulpMeta = const VerificationMeta('ulp');
  @override
  late final GeneratedColumn<String> ulp = GeneratedColumn<String>(
      'ulp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _garduMeta = const VerificationMeta('gardu');
  @override
  late final GeneratedColumn<String> gardu = GeneratedColumn<String>(
      'gardu', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _alamatMeta = const VerificationMeta('alamat');
  @override
  late final GeneratedColumn<String> alamat = GeneratedColumn<String>(
      'alamat', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _penyulangMeta =
      const VerificationMeta('penyulang');
  @override
  late final GeneratedColumn<String> penyulang = GeneratedColumn<String>(
      'penyulang', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _sectionMeta =
      const VerificationMeta('section');
  @override
  late final GeneratedColumn<String> section = GeneratedColumn<String>(
      'section', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _jenisGarduMeta =
      const VerificationMeta('jenisGardu');
  @override
  late final GeneratedColumn<String> jenisGardu = GeneratedColumn<String>(
      'jenis_gardu', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _merkMeta = const VerificationMeta('merk');
  @override
  late final GeneratedColumn<String> merk = GeneratedColumn<String>(
      'merk', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kapasitasKvaMeta =
      const VerificationMeta('kapasitasKva');
  @override
  late final GeneratedColumn<String> kapasitasKva = GeneratedColumn<String>(
      'kapasitas_kva', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _noSeriMeta = const VerificationMeta('noSeri');
  @override
  late final GeneratedColumn<String> noSeri = GeneratedColumn<String>(
      'no_seri', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tahunTrafoMeta =
      const VerificationMeta('tahunTrafo');
  @override
  late final GeneratedColumn<String> tahunTrafo = GeneratedColumn<String>(
      'tahun_trafo', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _typeSealMeta =
      const VerificationMeta('typeSeal');
  @override
  late final GeneratedColumn<String> typeSeal = GeneratedColumn<String>(
      'type_seal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _beratTrafoMeta =
      const VerificationMeta('beratTrafo');
  @override
  late final GeneratedColumn<String> beratTrafo = GeneratedColumn<String>(
      'berat_trafo', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _volumeMinyakMeta =
      const VerificationMeta('volumeMinyak');
  @override
  late final GeneratedColumn<String> volumeMinyak = GeneratedColumn<String>(
      'volume_minyak', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _merkPhbTrMeta =
      const VerificationMeta('merkPhbTr');
  @override
  late final GeneratedColumn<String> merkPhbTr = GeneratedColumn<String>(
      'merk_phb_tr', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _nomorSeriPhbTrMeta =
      const VerificationMeta('nomorSeriPhbTr');
  @override
  late final GeneratedColumn<String> nomorSeriPhbTr = GeneratedColumn<String>(
      'nomor_seri_phb_tr', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tahunPhbTrMeta =
      const VerificationMeta('tahunPhbTr');
  @override
  late final GeneratedColumn<String> tahunPhbTr = GeneratedColumn<String>(
      'tahun_phb_tr', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _jamUkurWbpMeta =
      const VerificationMeta('jamUkurWbp');
  @override
  late final GeneratedColumn<String> jamUkurWbp = GeneratedColumn<String>(
      'jam_ukur_wbp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tanggalPengukuranMeta =
      const VerificationMeta('tanggalPengukuran');
  @override
  late final GeneratedColumn<String> tanggalPengukuran =
      GeneratedColumn<String>('tanggal_pengukuran', aliasedName, false,
          type: DriftSqlType.string,
          requiredDuringInsert: false,
          defaultValue: const Constant(''));
  static const VerificationMeta _kepemilikanMeta =
      const VerificationMeta('kepemilikan');
  @override
  late final GeneratedColumn<String> kepemilikan = GeneratedColumn<String>(
      'kepemilikan', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpRsMeta = const VerificationMeta('wbpRs');
  @override
  late final GeneratedColumn<String> wbpRs = GeneratedColumn<String>(
      'wbp_rs', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpStMeta = const VerificationMeta('wbpSt');
  @override
  late final GeneratedColumn<String> wbpSt = GeneratedColumn<String>(
      'wbp_st', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpTrMeta = const VerificationMeta('wbpTr');
  @override
  late final GeneratedColumn<String> wbpTr = GeneratedColumn<String>(
      'wbp_tr', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpRnMeta = const VerificationMeta('wbpRn');
  @override
  late final GeneratedColumn<String> wbpRn = GeneratedColumn<String>(
      'wbp_rn', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpSnMeta = const VerificationMeta('wbpSn');
  @override
  late final GeneratedColumn<String> wbpSn = GeneratedColumn<String>(
      'wbp_sn', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpTnMeta = const VerificationMeta('wbpTn');
  @override
  late final GeneratedColumn<String> wbpTn = GeneratedColumn<String>(
      'wbp_tn', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpRMeta = const VerificationMeta('wbpR');
  @override
  late final GeneratedColumn<String> wbpR = GeneratedColumn<String>(
      'wbp_r', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpSMeta = const VerificationMeta('wbpS');
  @override
  late final GeneratedColumn<String> wbpS = GeneratedColumn<String>(
      'wbp_s', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpTMeta = const VerificationMeta('wbpT');
  @override
  late final GeneratedColumn<String> wbpT = GeneratedColumn<String>(
      'wbp_t', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _wbpNMeta = const VerificationMeta('wbpN');
  @override
  late final GeneratedColumn<String> wbpN = GeneratedColumn<String>(
      'wbp_n', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpRsMeta = const VerificationMeta('lwbpRs');
  @override
  late final GeneratedColumn<String> lwbpRs = GeneratedColumn<String>(
      'lwbp_rs', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpStMeta = const VerificationMeta('lwbpSt');
  @override
  late final GeneratedColumn<String> lwbpSt = GeneratedColumn<String>(
      'lwbp_st', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpTrMeta = const VerificationMeta('lwbpTr');
  @override
  late final GeneratedColumn<String> lwbpTr = GeneratedColumn<String>(
      'lwbp_tr', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpRnMeta = const VerificationMeta('lwbpRn');
  @override
  late final GeneratedColumn<String> lwbpRn = GeneratedColumn<String>(
      'lwbp_rn', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpSnMeta = const VerificationMeta('lwbpSn');
  @override
  late final GeneratedColumn<String> lwbpSn = GeneratedColumn<String>(
      'lwbp_sn', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpTnMeta = const VerificationMeta('lwbpTn');
  @override
  late final GeneratedColumn<String> lwbpTn = GeneratedColumn<String>(
      'lwbp_tn', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpRMeta = const VerificationMeta('lwbpR');
  @override
  late final GeneratedColumn<String> lwbpR = GeneratedColumn<String>(
      'lwbp_r', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpSMeta = const VerificationMeta('lwbpS');
  @override
  late final GeneratedColumn<String> lwbpS = GeneratedColumn<String>(
      'lwbp_s', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpTMeta = const VerificationMeta('lwbpT');
  @override
  late final GeneratedColumn<String> lwbpT = GeneratedColumn<String>(
      'lwbp_t', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _lwbpNMeta = const VerificationMeta('lwbpN');
  @override
  late final GeneratedColumn<String> lwbpN = GeneratedColumn<String>(
      'lwbp_n', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _arusMaxPerFasaMeta =
      const VerificationMeta('arusMaxPerFasa');
  @override
  late final GeneratedColumn<String> arusMaxPerFasa = GeneratedColumn<String>(
      'arus_max_per_fasa', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _pembebananKvaMeta =
      const VerificationMeta('pembebananKva');
  @override
  late final GeneratedColumn<String> pembebananKva = GeneratedColumn<String>(
      'pembebanan_kva', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _pembebananKwMeta =
      const VerificationMeta('pembebananKw');
  @override
  late final GeneratedColumn<String> pembebananKw = GeneratedColumn<String>(
      'pembebanan_kw', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _persentaseBebanMeta =
      const VerificationMeta('persentaseBeban');
  @override
  late final GeneratedColumn<String> persentaseBeban = GeneratedColumn<String>(
      'persentase_beban', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kategoriBebanMeta =
      const VerificationMeta('kategoriBeban');
  @override
  late final GeneratedColumn<String> kategoriBeban = GeneratedColumn<String>(
      'kategori_beban', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns => [
        ulp,
        gardu,
        alamat,
        penyulang,
        section,
        jenisGardu,
        merk,
        kapasitasKva,
        noSeri,
        tahunTrafo,
        typeSeal,
        beratTrafo,
        volumeMinyak,
        merkPhbTr,
        nomorSeriPhbTr,
        tahunPhbTr,
        jamUkurWbp,
        tanggalPengukuran,
        kepemilikan,
        wbpRs,
        wbpSt,
        wbpTr,
        wbpRn,
        wbpSn,
        wbpTn,
        wbpR,
        wbpS,
        wbpT,
        wbpN,
        lwbpRs,
        lwbpSt,
        lwbpTr,
        lwbpRn,
        lwbpSn,
        lwbpTn,
        lwbpR,
        lwbpS,
        lwbpT,
        lwbpN,
        arusMaxPerFasa,
        pembebananKva,
        pembebananKw,
        persentaseBeban,
        kategoriBeban
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'master_gardu';
  @override
  VerificationContext validateIntegrity(Insertable<MasterGardusData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('ulp')) {
      context.handle(
          _ulpMeta, ulp.isAcceptableOrUnknown(data['ulp']!, _ulpMeta));
    }
    if (data.containsKey('gardu')) {
      context.handle(
          _garduMeta, gardu.isAcceptableOrUnknown(data['gardu']!, _garduMeta));
    } else if (isInserting) {
      context.missing(_garduMeta);
    }
    if (data.containsKey('alamat')) {
      context.handle(_alamatMeta,
          alamat.isAcceptableOrUnknown(data['alamat']!, _alamatMeta));
    }
    if (data.containsKey('penyulang')) {
      context.handle(_penyulangMeta,
          penyulang.isAcceptableOrUnknown(data['penyulang']!, _penyulangMeta));
    }
    if (data.containsKey('section')) {
      context.handle(_sectionMeta,
          section.isAcceptableOrUnknown(data['section']!, _sectionMeta));
    }
    if (data.containsKey('jenis_gardu')) {
      context.handle(
          _jenisGarduMeta,
          jenisGardu.isAcceptableOrUnknown(
              data['jenis_gardu']!, _jenisGarduMeta));
    }
    if (data.containsKey('merk')) {
      context.handle(
          _merkMeta, merk.isAcceptableOrUnknown(data['merk']!, _merkMeta));
    }
    if (data.containsKey('kapasitas_kva')) {
      context.handle(
          _kapasitasKvaMeta,
          kapasitasKva.isAcceptableOrUnknown(
              data['kapasitas_kva']!, _kapasitasKvaMeta));
    }
    if (data.containsKey('no_seri')) {
      context.handle(_noSeriMeta,
          noSeri.isAcceptableOrUnknown(data['no_seri']!, _noSeriMeta));
    }
    if (data.containsKey('tahun_trafo')) {
      context.handle(
          _tahunTrafoMeta,
          tahunTrafo.isAcceptableOrUnknown(
              data['tahun_trafo']!, _tahunTrafoMeta));
    }
    if (data.containsKey('type_seal')) {
      context.handle(_typeSealMeta,
          typeSeal.isAcceptableOrUnknown(data['type_seal']!, _typeSealMeta));
    }
    if (data.containsKey('berat_trafo')) {
      context.handle(
          _beratTrafoMeta,
          beratTrafo.isAcceptableOrUnknown(
              data['berat_trafo']!, _beratTrafoMeta));
    }
    if (data.containsKey('volume_minyak')) {
      context.handle(
          _volumeMinyakMeta,
          volumeMinyak.isAcceptableOrUnknown(
              data['volume_minyak']!, _volumeMinyakMeta));
    }
    if (data.containsKey('merk_phb_tr')) {
      context.handle(
          _merkPhbTrMeta,
          merkPhbTr.isAcceptableOrUnknown(
              data['merk_phb_tr']!, _merkPhbTrMeta));
    }
    if (data.containsKey('nomor_seri_phb_tr')) {
      context.handle(
          _nomorSeriPhbTrMeta,
          nomorSeriPhbTr.isAcceptableOrUnknown(
              data['nomor_seri_phb_tr']!, _nomorSeriPhbTrMeta));
    }
    if (data.containsKey('tahun_phb_tr')) {
      context.handle(
          _tahunPhbTrMeta,
          tahunPhbTr.isAcceptableOrUnknown(
              data['tahun_phb_tr']!, _tahunPhbTrMeta));
    }
    if (data.containsKey('jam_ukur_wbp')) {
      context.handle(
          _jamUkurWbpMeta,
          jamUkurWbp.isAcceptableOrUnknown(
              data['jam_ukur_wbp']!, _jamUkurWbpMeta));
    }
    if (data.containsKey('tanggal_pengukuran')) {
      context.handle(
          _tanggalPengukuranMeta,
          tanggalPengukuran.isAcceptableOrUnknown(
              data['tanggal_pengukuran']!, _tanggalPengukuranMeta));
    }
    if (data.containsKey('kepemilikan')) {
      context.handle(
          _kepemilikanMeta,
          kepemilikan.isAcceptableOrUnknown(
              data['kepemilikan']!, _kepemilikanMeta));
    }
    if (data.containsKey('wbp_rs')) {
      context.handle(
          _wbpRsMeta, wbpRs.isAcceptableOrUnknown(data['wbp_rs']!, _wbpRsMeta));
    }
    if (data.containsKey('wbp_st')) {
      context.handle(
          _wbpStMeta, wbpSt.isAcceptableOrUnknown(data['wbp_st']!, _wbpStMeta));
    }
    if (data.containsKey('wbp_tr')) {
      context.handle(
          _wbpTrMeta, wbpTr.isAcceptableOrUnknown(data['wbp_tr']!, _wbpTrMeta));
    }
    if (data.containsKey('wbp_rn')) {
      context.handle(
          _wbpRnMeta, wbpRn.isAcceptableOrUnknown(data['wbp_rn']!, _wbpRnMeta));
    }
    if (data.containsKey('wbp_sn')) {
      context.handle(
          _wbpSnMeta, wbpSn.isAcceptableOrUnknown(data['wbp_sn']!, _wbpSnMeta));
    }
    if (data.containsKey('wbp_tn')) {
      context.handle(
          _wbpTnMeta, wbpTn.isAcceptableOrUnknown(data['wbp_tn']!, _wbpTnMeta));
    }
    if (data.containsKey('wbp_r')) {
      context.handle(
          _wbpRMeta, wbpR.isAcceptableOrUnknown(data['wbp_r']!, _wbpRMeta));
    }
    if (data.containsKey('wbp_s')) {
      context.handle(
          _wbpSMeta, wbpS.isAcceptableOrUnknown(data['wbp_s']!, _wbpSMeta));
    }
    if (data.containsKey('wbp_t')) {
      context.handle(
          _wbpTMeta, wbpT.isAcceptableOrUnknown(data['wbp_t']!, _wbpTMeta));
    }
    if (data.containsKey('wbp_n')) {
      context.handle(
          _wbpNMeta, wbpN.isAcceptableOrUnknown(data['wbp_n']!, _wbpNMeta));
    }
    if (data.containsKey('lwbp_rs')) {
      context.handle(_lwbpRsMeta,
          lwbpRs.isAcceptableOrUnknown(data['lwbp_rs']!, _lwbpRsMeta));
    }
    if (data.containsKey('lwbp_st')) {
      context.handle(_lwbpStMeta,
          lwbpSt.isAcceptableOrUnknown(data['lwbp_st']!, _lwbpStMeta));
    }
    if (data.containsKey('lwbp_tr')) {
      context.handle(_lwbpTrMeta,
          lwbpTr.isAcceptableOrUnknown(data['lwbp_tr']!, _lwbpTrMeta));
    }
    if (data.containsKey('lwbp_rn')) {
      context.handle(_lwbpRnMeta,
          lwbpRn.isAcceptableOrUnknown(data['lwbp_rn']!, _lwbpRnMeta));
    }
    if (data.containsKey('lwbp_sn')) {
      context.handle(_lwbpSnMeta,
          lwbpSn.isAcceptableOrUnknown(data['lwbp_sn']!, _lwbpSnMeta));
    }
    if (data.containsKey('lwbp_tn')) {
      context.handle(_lwbpTnMeta,
          lwbpTn.isAcceptableOrUnknown(data['lwbp_tn']!, _lwbpTnMeta));
    }
    if (data.containsKey('lwbp_r')) {
      context.handle(
          _lwbpRMeta, lwbpR.isAcceptableOrUnknown(data['lwbp_r']!, _lwbpRMeta));
    }
    if (data.containsKey('lwbp_s')) {
      context.handle(
          _lwbpSMeta, lwbpS.isAcceptableOrUnknown(data['lwbp_s']!, _lwbpSMeta));
    }
    if (data.containsKey('lwbp_t')) {
      context.handle(
          _lwbpTMeta, lwbpT.isAcceptableOrUnknown(data['lwbp_t']!, _lwbpTMeta));
    }
    if (data.containsKey('lwbp_n')) {
      context.handle(
          _lwbpNMeta, lwbpN.isAcceptableOrUnknown(data['lwbp_n']!, _lwbpNMeta));
    }
    if (data.containsKey('arus_max_per_fasa')) {
      context.handle(
          _arusMaxPerFasaMeta,
          arusMaxPerFasa.isAcceptableOrUnknown(
              data['arus_max_per_fasa']!, _arusMaxPerFasaMeta));
    }
    if (data.containsKey('pembebanan_kva')) {
      context.handle(
          _pembebananKvaMeta,
          pembebananKva.isAcceptableOrUnknown(
              data['pembebanan_kva']!, _pembebananKvaMeta));
    }
    if (data.containsKey('pembebanan_kw')) {
      context.handle(
          _pembebananKwMeta,
          pembebananKw.isAcceptableOrUnknown(
              data['pembebanan_kw']!, _pembebananKwMeta));
    }
    if (data.containsKey('persentase_beban')) {
      context.handle(
          _persentaseBebanMeta,
          persentaseBeban.isAcceptableOrUnknown(
              data['persentase_beban']!, _persentaseBebanMeta));
    }
    if (data.containsKey('kategori_beban')) {
      context.handle(
          _kategoriBebanMeta,
          kategoriBeban.isAcceptableOrUnknown(
              data['kategori_beban']!, _kategoriBebanMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {gardu};
  @override
  MasterGardusData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MasterGardusData(
      ulp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ulp'])!,
      gardu: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}gardu'])!,
      alamat: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}alamat'])!,
      penyulang: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}penyulang'])!,
      section: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}section'])!,
      jenisGardu: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}jenis_gardu'])!,
      merk: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}merk'])!,
      kapasitasKva: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kapasitas_kva'])!,
      noSeri: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}no_seri'])!,
      tahunTrafo: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tahun_trafo'])!,
      typeSeal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}type_seal'])!,
      beratTrafo: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}berat_trafo'])!,
      volumeMinyak: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}volume_minyak'])!,
      merkPhbTr: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}merk_phb_tr'])!,
      nomorSeriPhbTr: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}nomor_seri_phb_tr'])!,
      tahunPhbTr: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tahun_phb_tr'])!,
      jamUkurWbp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}jam_ukur_wbp'])!,
      tanggalPengukuran: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}tanggal_pengukuran'])!,
      kepemilikan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kepemilikan'])!,
      wbpRs: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_rs'])!,
      wbpSt: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_st'])!,
      wbpTr: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_tr'])!,
      wbpRn: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_rn'])!,
      wbpSn: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_sn'])!,
      wbpTn: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_tn'])!,
      wbpR: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_r'])!,
      wbpS: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_s'])!,
      wbpT: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_t'])!,
      wbpN: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}wbp_n'])!,
      lwbpRs: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_rs'])!,
      lwbpSt: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_st'])!,
      lwbpTr: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_tr'])!,
      lwbpRn: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_rn'])!,
      lwbpSn: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_sn'])!,
      lwbpTn: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_tn'])!,
      lwbpR: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_r'])!,
      lwbpS: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_s'])!,
      lwbpT: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_t'])!,
      lwbpN: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}lwbp_n'])!,
      arusMaxPerFasa: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}arus_max_per_fasa'])!,
      pembebananKva: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}pembebanan_kva'])!,
      pembebananKw: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}pembebanan_kw'])!,
      persentaseBeban: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}persentase_beban'])!,
      kategoriBeban: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kategori_beban'])!,
    );
  }

  @override
  $MasterGardusTable createAlias(String alias) {
    return $MasterGardusTable(attachedDatabase, alias);
  }
}

class MasterGardusData extends DataClass
    implements Insertable<MasterGardusData> {
  final String ulp;
  final String gardu;
  final String alamat;
  final String penyulang;
  final String section;
  final String jenisGardu;
  final String merk;
  final String kapasitasKva;
  final String noSeri;
  final String tahunTrafo;
  final String typeSeal;
  final String beratTrafo;
  final String volumeMinyak;
  final String merkPhbTr;
  final String nomorSeriPhbTr;
  final String tahunPhbTr;
  final String jamUkurWbp;
  final String tanggalPengukuran;
  final String kepemilikan;
  final String wbpRs;
  final String wbpSt;
  final String wbpTr;
  final String wbpRn;
  final String wbpSn;
  final String wbpTn;
  final String wbpR;
  final String wbpS;
  final String wbpT;
  final String wbpN;
  final String lwbpRs;
  final String lwbpSt;
  final String lwbpTr;
  final String lwbpRn;
  final String lwbpSn;
  final String lwbpTn;
  final String lwbpR;
  final String lwbpS;
  final String lwbpT;
  final String lwbpN;
  final String arusMaxPerFasa;
  final String pembebananKva;
  final String pembebananKw;
  final String persentaseBeban;
  final String kategoriBeban;
  const MasterGardusData(
      {required this.ulp,
      required this.gardu,
      required this.alamat,
      required this.penyulang,
      required this.section,
      required this.jenisGardu,
      required this.merk,
      required this.kapasitasKva,
      required this.noSeri,
      required this.tahunTrafo,
      required this.typeSeal,
      required this.beratTrafo,
      required this.volumeMinyak,
      required this.merkPhbTr,
      required this.nomorSeriPhbTr,
      required this.tahunPhbTr,
      required this.jamUkurWbp,
      required this.tanggalPengukuran,
      required this.kepemilikan,
      required this.wbpRs,
      required this.wbpSt,
      required this.wbpTr,
      required this.wbpRn,
      required this.wbpSn,
      required this.wbpTn,
      required this.wbpR,
      required this.wbpS,
      required this.wbpT,
      required this.wbpN,
      required this.lwbpRs,
      required this.lwbpSt,
      required this.lwbpTr,
      required this.lwbpRn,
      required this.lwbpSn,
      required this.lwbpTn,
      required this.lwbpR,
      required this.lwbpS,
      required this.lwbpT,
      required this.lwbpN,
      required this.arusMaxPerFasa,
      required this.pembebananKva,
      required this.pembebananKw,
      required this.persentaseBeban,
      required this.kategoriBeban});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['ulp'] = Variable<String>(ulp);
    map['gardu'] = Variable<String>(gardu);
    map['alamat'] = Variable<String>(alamat);
    map['penyulang'] = Variable<String>(penyulang);
    map['section'] = Variable<String>(section);
    map['jenis_gardu'] = Variable<String>(jenisGardu);
    map['merk'] = Variable<String>(merk);
    map['kapasitas_kva'] = Variable<String>(kapasitasKva);
    map['no_seri'] = Variable<String>(noSeri);
    map['tahun_trafo'] = Variable<String>(tahunTrafo);
    map['type_seal'] = Variable<String>(typeSeal);
    map['berat_trafo'] = Variable<String>(beratTrafo);
    map['volume_minyak'] = Variable<String>(volumeMinyak);
    map['merk_phb_tr'] = Variable<String>(merkPhbTr);
    map['nomor_seri_phb_tr'] = Variable<String>(nomorSeriPhbTr);
    map['tahun_phb_tr'] = Variable<String>(tahunPhbTr);
    map['jam_ukur_wbp'] = Variable<String>(jamUkurWbp);
    map['tanggal_pengukuran'] = Variable<String>(tanggalPengukuran);
    map['kepemilikan'] = Variable<String>(kepemilikan);
    map['wbp_rs'] = Variable<String>(wbpRs);
    map['wbp_st'] = Variable<String>(wbpSt);
    map['wbp_tr'] = Variable<String>(wbpTr);
    map['wbp_rn'] = Variable<String>(wbpRn);
    map['wbp_sn'] = Variable<String>(wbpSn);
    map['wbp_tn'] = Variable<String>(wbpTn);
    map['wbp_r'] = Variable<String>(wbpR);
    map['wbp_s'] = Variable<String>(wbpS);
    map['wbp_t'] = Variable<String>(wbpT);
    map['wbp_n'] = Variable<String>(wbpN);
    map['lwbp_rs'] = Variable<String>(lwbpRs);
    map['lwbp_st'] = Variable<String>(lwbpSt);
    map['lwbp_tr'] = Variable<String>(lwbpTr);
    map['lwbp_rn'] = Variable<String>(lwbpRn);
    map['lwbp_sn'] = Variable<String>(lwbpSn);
    map['lwbp_tn'] = Variable<String>(lwbpTn);
    map['lwbp_r'] = Variable<String>(lwbpR);
    map['lwbp_s'] = Variable<String>(lwbpS);
    map['lwbp_t'] = Variable<String>(lwbpT);
    map['lwbp_n'] = Variable<String>(lwbpN);
    map['arus_max_per_fasa'] = Variable<String>(arusMaxPerFasa);
    map['pembebanan_kva'] = Variable<String>(pembebananKva);
    map['pembebanan_kw'] = Variable<String>(pembebananKw);
    map['persentase_beban'] = Variable<String>(persentaseBeban);
    map['kategori_beban'] = Variable<String>(kategoriBeban);
    return map;
  }

  MasterGardusCompanion toCompanion(bool nullToAbsent) {
    return MasterGardusCompanion(
      ulp: Value(ulp),
      gardu: Value(gardu),
      alamat: Value(alamat),
      penyulang: Value(penyulang),
      section: Value(section),
      jenisGardu: Value(jenisGardu),
      merk: Value(merk),
      kapasitasKva: Value(kapasitasKva),
      noSeri: Value(noSeri),
      tahunTrafo: Value(tahunTrafo),
      typeSeal: Value(typeSeal),
      beratTrafo: Value(beratTrafo),
      volumeMinyak: Value(volumeMinyak),
      merkPhbTr: Value(merkPhbTr),
      nomorSeriPhbTr: Value(nomorSeriPhbTr),
      tahunPhbTr: Value(tahunPhbTr),
      jamUkurWbp: Value(jamUkurWbp),
      tanggalPengukuran: Value(tanggalPengukuran),
      kepemilikan: Value(kepemilikan),
      wbpRs: Value(wbpRs),
      wbpSt: Value(wbpSt),
      wbpTr: Value(wbpTr),
      wbpRn: Value(wbpRn),
      wbpSn: Value(wbpSn),
      wbpTn: Value(wbpTn),
      wbpR: Value(wbpR),
      wbpS: Value(wbpS),
      wbpT: Value(wbpT),
      wbpN: Value(wbpN),
      lwbpRs: Value(lwbpRs),
      lwbpSt: Value(lwbpSt),
      lwbpTr: Value(lwbpTr),
      lwbpRn: Value(lwbpRn),
      lwbpSn: Value(lwbpSn),
      lwbpTn: Value(lwbpTn),
      lwbpR: Value(lwbpR),
      lwbpS: Value(lwbpS),
      lwbpT: Value(lwbpT),
      lwbpN: Value(lwbpN),
      arusMaxPerFasa: Value(arusMaxPerFasa),
      pembebananKva: Value(pembebananKva),
      pembebananKw: Value(pembebananKw),
      persentaseBeban: Value(persentaseBeban),
      kategoriBeban: Value(kategoriBeban),
    );
  }

  factory MasterGardusData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MasterGardusData(
      ulp: serializer.fromJson<String>(json['ulp']),
      gardu: serializer.fromJson<String>(json['gardu']),
      alamat: serializer.fromJson<String>(json['alamat']),
      penyulang: serializer.fromJson<String>(json['penyulang']),
      section: serializer.fromJson<String>(json['section']),
      jenisGardu: serializer.fromJson<String>(json['jenisGardu']),
      merk: serializer.fromJson<String>(json['merk']),
      kapasitasKva: serializer.fromJson<String>(json['kapasitasKva']),
      noSeri: serializer.fromJson<String>(json['noSeri']),
      tahunTrafo: serializer.fromJson<String>(json['tahunTrafo']),
      typeSeal: serializer.fromJson<String>(json['typeSeal']),
      beratTrafo: serializer.fromJson<String>(json['beratTrafo']),
      volumeMinyak: serializer.fromJson<String>(json['volumeMinyak']),
      merkPhbTr: serializer.fromJson<String>(json['merkPhbTr']),
      nomorSeriPhbTr: serializer.fromJson<String>(json['nomorSeriPhbTr']),
      tahunPhbTr: serializer.fromJson<String>(json['tahunPhbTr']),
      jamUkurWbp: serializer.fromJson<String>(json['jamUkurWbp']),
      tanggalPengukuran: serializer.fromJson<String>(json['tanggalPengukuran']),
      kepemilikan: serializer.fromJson<String>(json['kepemilikan']),
      wbpRs: serializer.fromJson<String>(json['wbpRs']),
      wbpSt: serializer.fromJson<String>(json['wbpSt']),
      wbpTr: serializer.fromJson<String>(json['wbpTr']),
      wbpRn: serializer.fromJson<String>(json['wbpRn']),
      wbpSn: serializer.fromJson<String>(json['wbpSn']),
      wbpTn: serializer.fromJson<String>(json['wbpTn']),
      wbpR: serializer.fromJson<String>(json['wbpR']),
      wbpS: serializer.fromJson<String>(json['wbpS']),
      wbpT: serializer.fromJson<String>(json['wbpT']),
      wbpN: serializer.fromJson<String>(json['wbpN']),
      lwbpRs: serializer.fromJson<String>(json['lwbpRs']),
      lwbpSt: serializer.fromJson<String>(json['lwbpSt']),
      lwbpTr: serializer.fromJson<String>(json['lwbpTr']),
      lwbpRn: serializer.fromJson<String>(json['lwbpRn']),
      lwbpSn: serializer.fromJson<String>(json['lwbpSn']),
      lwbpTn: serializer.fromJson<String>(json['lwbpTn']),
      lwbpR: serializer.fromJson<String>(json['lwbpR']),
      lwbpS: serializer.fromJson<String>(json['lwbpS']),
      lwbpT: serializer.fromJson<String>(json['lwbpT']),
      lwbpN: serializer.fromJson<String>(json['lwbpN']),
      arusMaxPerFasa: serializer.fromJson<String>(json['arusMaxPerFasa']),
      pembebananKva: serializer.fromJson<String>(json['pembebananKva']),
      pembebananKw: serializer.fromJson<String>(json['pembebananKw']),
      persentaseBeban: serializer.fromJson<String>(json['persentaseBeban']),
      kategoriBeban: serializer.fromJson<String>(json['kategoriBeban']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'ulp': serializer.toJson<String>(ulp),
      'gardu': serializer.toJson<String>(gardu),
      'alamat': serializer.toJson<String>(alamat),
      'penyulang': serializer.toJson<String>(penyulang),
      'section': serializer.toJson<String>(section),
      'jenisGardu': serializer.toJson<String>(jenisGardu),
      'merk': serializer.toJson<String>(merk),
      'kapasitasKva': serializer.toJson<String>(kapasitasKva),
      'noSeri': serializer.toJson<String>(noSeri),
      'tahunTrafo': serializer.toJson<String>(tahunTrafo),
      'typeSeal': serializer.toJson<String>(typeSeal),
      'beratTrafo': serializer.toJson<String>(beratTrafo),
      'volumeMinyak': serializer.toJson<String>(volumeMinyak),
      'merkPhbTr': serializer.toJson<String>(merkPhbTr),
      'nomorSeriPhbTr': serializer.toJson<String>(nomorSeriPhbTr),
      'tahunPhbTr': serializer.toJson<String>(tahunPhbTr),
      'jamUkurWbp': serializer.toJson<String>(jamUkurWbp),
      'tanggalPengukuran': serializer.toJson<String>(tanggalPengukuran),
      'kepemilikan': serializer.toJson<String>(kepemilikan),
      'wbpRs': serializer.toJson<String>(wbpRs),
      'wbpSt': serializer.toJson<String>(wbpSt),
      'wbpTr': serializer.toJson<String>(wbpTr),
      'wbpRn': serializer.toJson<String>(wbpRn),
      'wbpSn': serializer.toJson<String>(wbpSn),
      'wbpTn': serializer.toJson<String>(wbpTn),
      'wbpR': serializer.toJson<String>(wbpR),
      'wbpS': serializer.toJson<String>(wbpS),
      'wbpT': serializer.toJson<String>(wbpT),
      'wbpN': serializer.toJson<String>(wbpN),
      'lwbpRs': serializer.toJson<String>(lwbpRs),
      'lwbpSt': serializer.toJson<String>(lwbpSt),
      'lwbpTr': serializer.toJson<String>(lwbpTr),
      'lwbpRn': serializer.toJson<String>(lwbpRn),
      'lwbpSn': serializer.toJson<String>(lwbpSn),
      'lwbpTn': serializer.toJson<String>(lwbpTn),
      'lwbpR': serializer.toJson<String>(lwbpR),
      'lwbpS': serializer.toJson<String>(lwbpS),
      'lwbpT': serializer.toJson<String>(lwbpT),
      'lwbpN': serializer.toJson<String>(lwbpN),
      'arusMaxPerFasa': serializer.toJson<String>(arusMaxPerFasa),
      'pembebananKva': serializer.toJson<String>(pembebananKva),
      'pembebananKw': serializer.toJson<String>(pembebananKw),
      'persentaseBeban': serializer.toJson<String>(persentaseBeban),
      'kategoriBeban': serializer.toJson<String>(kategoriBeban),
    };
  }

  MasterGardusData copyWith(
          {String? ulp,
          String? gardu,
          String? alamat,
          String? penyulang,
          String? section,
          String? jenisGardu,
          String? merk,
          String? kapasitasKva,
          String? noSeri,
          String? tahunTrafo,
          String? typeSeal,
          String? beratTrafo,
          String? volumeMinyak,
          String? merkPhbTr,
          String? nomorSeriPhbTr,
          String? tahunPhbTr,
          String? jamUkurWbp,
          String? tanggalPengukuran,
          String? kepemilikan,
          String? wbpRs,
          String? wbpSt,
          String? wbpTr,
          String? wbpRn,
          String? wbpSn,
          String? wbpTn,
          String? wbpR,
          String? wbpS,
          String? wbpT,
          String? wbpN,
          String? lwbpRs,
          String? lwbpSt,
          String? lwbpTr,
          String? lwbpRn,
          String? lwbpSn,
          String? lwbpTn,
          String? lwbpR,
          String? lwbpS,
          String? lwbpT,
          String? lwbpN,
          String? arusMaxPerFasa,
          String? pembebananKva,
          String? pembebananKw,
          String? persentaseBeban,
          String? kategoriBeban}) =>
      MasterGardusData(
        ulp: ulp ?? this.ulp,
        gardu: gardu ?? this.gardu,
        alamat: alamat ?? this.alamat,
        penyulang: penyulang ?? this.penyulang,
        section: section ?? this.section,
        jenisGardu: jenisGardu ?? this.jenisGardu,
        merk: merk ?? this.merk,
        kapasitasKva: kapasitasKva ?? this.kapasitasKva,
        noSeri: noSeri ?? this.noSeri,
        tahunTrafo: tahunTrafo ?? this.tahunTrafo,
        typeSeal: typeSeal ?? this.typeSeal,
        beratTrafo: beratTrafo ?? this.beratTrafo,
        volumeMinyak: volumeMinyak ?? this.volumeMinyak,
        merkPhbTr: merkPhbTr ?? this.merkPhbTr,
        nomorSeriPhbTr: nomorSeriPhbTr ?? this.nomorSeriPhbTr,
        tahunPhbTr: tahunPhbTr ?? this.tahunPhbTr,
        jamUkurWbp: jamUkurWbp ?? this.jamUkurWbp,
        tanggalPengukuran: tanggalPengukuran ?? this.tanggalPengukuran,
        kepemilikan: kepemilikan ?? this.kepemilikan,
        wbpRs: wbpRs ?? this.wbpRs,
        wbpSt: wbpSt ?? this.wbpSt,
        wbpTr: wbpTr ?? this.wbpTr,
        wbpRn: wbpRn ?? this.wbpRn,
        wbpSn: wbpSn ?? this.wbpSn,
        wbpTn: wbpTn ?? this.wbpTn,
        wbpR: wbpR ?? this.wbpR,
        wbpS: wbpS ?? this.wbpS,
        wbpT: wbpT ?? this.wbpT,
        wbpN: wbpN ?? this.wbpN,
        lwbpRs: lwbpRs ?? this.lwbpRs,
        lwbpSt: lwbpSt ?? this.lwbpSt,
        lwbpTr: lwbpTr ?? this.lwbpTr,
        lwbpRn: lwbpRn ?? this.lwbpRn,
        lwbpSn: lwbpSn ?? this.lwbpSn,
        lwbpTn: lwbpTn ?? this.lwbpTn,
        lwbpR: lwbpR ?? this.lwbpR,
        lwbpS: lwbpS ?? this.lwbpS,
        lwbpT: lwbpT ?? this.lwbpT,
        lwbpN: lwbpN ?? this.lwbpN,
        arusMaxPerFasa: arusMaxPerFasa ?? this.arusMaxPerFasa,
        pembebananKva: pembebananKva ?? this.pembebananKva,
        pembebananKw: pembebananKw ?? this.pembebananKw,
        persentaseBeban: persentaseBeban ?? this.persentaseBeban,
        kategoriBeban: kategoriBeban ?? this.kategoriBeban,
      );
  MasterGardusData copyWithCompanion(MasterGardusCompanion data) {
    return MasterGardusData(
      ulp: data.ulp.present ? data.ulp.value : this.ulp,
      gardu: data.gardu.present ? data.gardu.value : this.gardu,
      alamat: data.alamat.present ? data.alamat.value : this.alamat,
      penyulang: data.penyulang.present ? data.penyulang.value : this.penyulang,
      section: data.section.present ? data.section.value : this.section,
      jenisGardu:
          data.jenisGardu.present ? data.jenisGardu.value : this.jenisGardu,
      merk: data.merk.present ? data.merk.value : this.merk,
      kapasitasKva: data.kapasitasKva.present
          ? data.kapasitasKva.value
          : this.kapasitasKva,
      noSeri: data.noSeri.present ? data.noSeri.value : this.noSeri,
      tahunTrafo:
          data.tahunTrafo.present ? data.tahunTrafo.value : this.tahunTrafo,
      typeSeal: data.typeSeal.present ? data.typeSeal.value : this.typeSeal,
      beratTrafo:
          data.beratTrafo.present ? data.beratTrafo.value : this.beratTrafo,
      volumeMinyak: data.volumeMinyak.present
          ? data.volumeMinyak.value
          : this.volumeMinyak,
      merkPhbTr: data.merkPhbTr.present ? data.merkPhbTr.value : this.merkPhbTr,
      nomorSeriPhbTr: data.nomorSeriPhbTr.present
          ? data.nomorSeriPhbTr.value
          : this.nomorSeriPhbTr,
      tahunPhbTr:
          data.tahunPhbTr.present ? data.tahunPhbTr.value : this.tahunPhbTr,
      jamUkurWbp:
          data.jamUkurWbp.present ? data.jamUkurWbp.value : this.jamUkurWbp,
      tanggalPengukuran: data.tanggalPengukuran.present
          ? data.tanggalPengukuran.value
          : this.tanggalPengukuran,
      kepemilikan:
          data.kepemilikan.present ? data.kepemilikan.value : this.kepemilikan,
      wbpRs: data.wbpRs.present ? data.wbpRs.value : this.wbpRs,
      wbpSt: data.wbpSt.present ? data.wbpSt.value : this.wbpSt,
      wbpTr: data.wbpTr.present ? data.wbpTr.value : this.wbpTr,
      wbpRn: data.wbpRn.present ? data.wbpRn.value : this.wbpRn,
      wbpSn: data.wbpSn.present ? data.wbpSn.value : this.wbpSn,
      wbpTn: data.wbpTn.present ? data.wbpTn.value : this.wbpTn,
      wbpR: data.wbpR.present ? data.wbpR.value : this.wbpR,
      wbpS: data.wbpS.present ? data.wbpS.value : this.wbpS,
      wbpT: data.wbpT.present ? data.wbpT.value : this.wbpT,
      wbpN: data.wbpN.present ? data.wbpN.value : this.wbpN,
      lwbpRs: data.lwbpRs.present ? data.lwbpRs.value : this.lwbpRs,
      lwbpSt: data.lwbpSt.present ? data.lwbpSt.value : this.lwbpSt,
      lwbpTr: data.lwbpTr.present ? data.lwbpTr.value : this.lwbpTr,
      lwbpRn: data.lwbpRn.present ? data.lwbpRn.value : this.lwbpRn,
      lwbpSn: data.lwbpSn.present ? data.lwbpSn.value : this.lwbpSn,
      lwbpTn: data.lwbpTn.present ? data.lwbpTn.value : this.lwbpTn,
      lwbpR: data.lwbpR.present ? data.lwbpR.value : this.lwbpR,
      lwbpS: data.lwbpS.present ? data.lwbpS.value : this.lwbpS,
      lwbpT: data.lwbpT.present ? data.lwbpT.value : this.lwbpT,
      lwbpN: data.lwbpN.present ? data.lwbpN.value : this.lwbpN,
      arusMaxPerFasa: data.arusMaxPerFasa.present
          ? data.arusMaxPerFasa.value
          : this.arusMaxPerFasa,
      pembebananKva: data.pembebananKva.present
          ? data.pembebananKva.value
          : this.pembebananKva,
      pembebananKw: data.pembebananKw.present
          ? data.pembebananKw.value
          : this.pembebananKw,
      persentaseBeban: data.persentaseBeban.present
          ? data.persentaseBeban.value
          : this.persentaseBeban,
      kategoriBeban: data.kategoriBeban.present
          ? data.kategoriBeban.value
          : this.kategoriBeban,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MasterGardusData(')
          ..write('ulp: $ulp, ')
          ..write('gardu: $gardu, ')
          ..write('alamat: $alamat, ')
          ..write('penyulang: $penyulang, ')
          ..write('section: $section, ')
          ..write('jenisGardu: $jenisGardu, ')
          ..write('merk: $merk, ')
          ..write('kapasitasKva: $kapasitasKva, ')
          ..write('noSeri: $noSeri, ')
          ..write('tahunTrafo: $tahunTrafo, ')
          ..write('typeSeal: $typeSeal, ')
          ..write('beratTrafo: $beratTrafo, ')
          ..write('volumeMinyak: $volumeMinyak, ')
          ..write('merkPhbTr: $merkPhbTr, ')
          ..write('nomorSeriPhbTr: $nomorSeriPhbTr, ')
          ..write('tahunPhbTr: $tahunPhbTr, ')
          ..write('jamUkurWbp: $jamUkurWbp, ')
          ..write('tanggalPengukuran: $tanggalPengukuran, ')
          ..write('kepemilikan: $kepemilikan, ')
          ..write('wbpRs: $wbpRs, ')
          ..write('wbpSt: $wbpSt, ')
          ..write('wbpTr: $wbpTr, ')
          ..write('wbpRn: $wbpRn, ')
          ..write('wbpSn: $wbpSn, ')
          ..write('wbpTn: $wbpTn, ')
          ..write('wbpR: $wbpR, ')
          ..write('wbpS: $wbpS, ')
          ..write('wbpT: $wbpT, ')
          ..write('wbpN: $wbpN, ')
          ..write('lwbpRs: $lwbpRs, ')
          ..write('lwbpSt: $lwbpSt, ')
          ..write('lwbpTr: $lwbpTr, ')
          ..write('lwbpRn: $lwbpRn, ')
          ..write('lwbpSn: $lwbpSn, ')
          ..write('lwbpTn: $lwbpTn, ')
          ..write('lwbpR: $lwbpR, ')
          ..write('lwbpS: $lwbpS, ')
          ..write('lwbpT: $lwbpT, ')
          ..write('lwbpN: $lwbpN, ')
          ..write('arusMaxPerFasa: $arusMaxPerFasa, ')
          ..write('pembebananKva: $pembebananKva, ')
          ..write('pembebananKw: $pembebananKw, ')
          ..write('persentaseBeban: $persentaseBeban, ')
          ..write('kategoriBeban: $kategoriBeban')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        ulp,
        gardu,
        alamat,
        penyulang,
        section,
        jenisGardu,
        merk,
        kapasitasKva,
        noSeri,
        tahunTrafo,
        typeSeal,
        beratTrafo,
        volumeMinyak,
        merkPhbTr,
        nomorSeriPhbTr,
        tahunPhbTr,
        jamUkurWbp,
        tanggalPengukuran,
        kepemilikan,
        wbpRs,
        wbpSt,
        wbpTr,
        wbpRn,
        wbpSn,
        wbpTn,
        wbpR,
        wbpS,
        wbpT,
        wbpN,
        lwbpRs,
        lwbpSt,
        lwbpTr,
        lwbpRn,
        lwbpSn,
        lwbpTn,
        lwbpR,
        lwbpS,
        lwbpT,
        lwbpN,
        arusMaxPerFasa,
        pembebananKva,
        pembebananKw,
        persentaseBeban,
        kategoriBeban
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MasterGardusData &&
          other.ulp == this.ulp &&
          other.gardu == this.gardu &&
          other.alamat == this.alamat &&
          other.penyulang == this.penyulang &&
          other.section == this.section &&
          other.jenisGardu == this.jenisGardu &&
          other.merk == this.merk &&
          other.kapasitasKva == this.kapasitasKva &&
          other.noSeri == this.noSeri &&
          other.tahunTrafo == this.tahunTrafo &&
          other.typeSeal == this.typeSeal &&
          other.beratTrafo == this.beratTrafo &&
          other.volumeMinyak == this.volumeMinyak &&
          other.merkPhbTr == this.merkPhbTr &&
          other.nomorSeriPhbTr == this.nomorSeriPhbTr &&
          other.tahunPhbTr == this.tahunPhbTr &&
          other.jamUkurWbp == this.jamUkurWbp &&
          other.tanggalPengukuran == this.tanggalPengukuran &&
          other.kepemilikan == this.kepemilikan &&
          other.wbpRs == this.wbpRs &&
          other.wbpSt == this.wbpSt &&
          other.wbpTr == this.wbpTr &&
          other.wbpRn == this.wbpRn &&
          other.wbpSn == this.wbpSn &&
          other.wbpTn == this.wbpTn &&
          other.wbpR == this.wbpR &&
          other.wbpS == this.wbpS &&
          other.wbpT == this.wbpT &&
          other.wbpN == this.wbpN &&
          other.lwbpRs == this.lwbpRs &&
          other.lwbpSt == this.lwbpSt &&
          other.lwbpTr == this.lwbpTr &&
          other.lwbpRn == this.lwbpRn &&
          other.lwbpSn == this.lwbpSn &&
          other.lwbpTn == this.lwbpTn &&
          other.lwbpR == this.lwbpR &&
          other.lwbpS == this.lwbpS &&
          other.lwbpT == this.lwbpT &&
          other.lwbpN == this.lwbpN &&
          other.arusMaxPerFasa == this.arusMaxPerFasa &&
          other.pembebananKva == this.pembebananKva &&
          other.pembebananKw == this.pembebananKw &&
          other.persentaseBeban == this.persentaseBeban &&
          other.kategoriBeban == this.kategoriBeban);
}

class MasterGardusCompanion extends UpdateCompanion<MasterGardusData> {
  final Value<String> ulp;
  final Value<String> gardu;
  final Value<String> alamat;
  final Value<String> penyulang;
  final Value<String> section;
  final Value<String> jenisGardu;
  final Value<String> merk;
  final Value<String> kapasitasKva;
  final Value<String> noSeri;
  final Value<String> tahunTrafo;
  final Value<String> typeSeal;
  final Value<String> beratTrafo;
  final Value<String> volumeMinyak;
  final Value<String> merkPhbTr;
  final Value<String> nomorSeriPhbTr;
  final Value<String> tahunPhbTr;
  final Value<String> jamUkurWbp;
  final Value<String> tanggalPengukuran;
  final Value<String> kepemilikan;
  final Value<String> wbpRs;
  final Value<String> wbpSt;
  final Value<String> wbpTr;
  final Value<String> wbpRn;
  final Value<String> wbpSn;
  final Value<String> wbpTn;
  final Value<String> wbpR;
  final Value<String> wbpS;
  final Value<String> wbpT;
  final Value<String> wbpN;
  final Value<String> lwbpRs;
  final Value<String> lwbpSt;
  final Value<String> lwbpTr;
  final Value<String> lwbpRn;
  final Value<String> lwbpSn;
  final Value<String> lwbpTn;
  final Value<String> lwbpR;
  final Value<String> lwbpS;
  final Value<String> lwbpT;
  final Value<String> lwbpN;
  final Value<String> arusMaxPerFasa;
  final Value<String> pembebananKva;
  final Value<String> pembebananKw;
  final Value<String> persentaseBeban;
  final Value<String> kategoriBeban;
  final Value<int> rowid;
  const MasterGardusCompanion({
    this.ulp = const Value.absent(),
    this.gardu = const Value.absent(),
    this.alamat = const Value.absent(),
    this.penyulang = const Value.absent(),
    this.section = const Value.absent(),
    this.jenisGardu = const Value.absent(),
    this.merk = const Value.absent(),
    this.kapasitasKva = const Value.absent(),
    this.noSeri = const Value.absent(),
    this.tahunTrafo = const Value.absent(),
    this.typeSeal = const Value.absent(),
    this.beratTrafo = const Value.absent(),
    this.volumeMinyak = const Value.absent(),
    this.merkPhbTr = const Value.absent(),
    this.nomorSeriPhbTr = const Value.absent(),
    this.tahunPhbTr = const Value.absent(),
    this.jamUkurWbp = const Value.absent(),
    this.tanggalPengukuran = const Value.absent(),
    this.kepemilikan = const Value.absent(),
    this.wbpRs = const Value.absent(),
    this.wbpSt = const Value.absent(),
    this.wbpTr = const Value.absent(),
    this.wbpRn = const Value.absent(),
    this.wbpSn = const Value.absent(),
    this.wbpTn = const Value.absent(),
    this.wbpR = const Value.absent(),
    this.wbpS = const Value.absent(),
    this.wbpT = const Value.absent(),
    this.wbpN = const Value.absent(),
    this.lwbpRs = const Value.absent(),
    this.lwbpSt = const Value.absent(),
    this.lwbpTr = const Value.absent(),
    this.lwbpRn = const Value.absent(),
    this.lwbpSn = const Value.absent(),
    this.lwbpTn = const Value.absent(),
    this.lwbpR = const Value.absent(),
    this.lwbpS = const Value.absent(),
    this.lwbpT = const Value.absent(),
    this.lwbpN = const Value.absent(),
    this.arusMaxPerFasa = const Value.absent(),
    this.pembebananKva = const Value.absent(),
    this.pembebananKw = const Value.absent(),
    this.persentaseBeban = const Value.absent(),
    this.kategoriBeban = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  MasterGardusCompanion.insert({
    this.ulp = const Value.absent(),
    required String gardu,
    this.alamat = const Value.absent(),
    this.penyulang = const Value.absent(),
    this.section = const Value.absent(),
    this.jenisGardu = const Value.absent(),
    this.merk = const Value.absent(),
    this.kapasitasKva = const Value.absent(),
    this.noSeri = const Value.absent(),
    this.tahunTrafo = const Value.absent(),
    this.typeSeal = const Value.absent(),
    this.beratTrafo = const Value.absent(),
    this.volumeMinyak = const Value.absent(),
    this.merkPhbTr = const Value.absent(),
    this.nomorSeriPhbTr = const Value.absent(),
    this.tahunPhbTr = const Value.absent(),
    this.jamUkurWbp = const Value.absent(),
    this.tanggalPengukuran = const Value.absent(),
    this.kepemilikan = const Value.absent(),
    this.wbpRs = const Value.absent(),
    this.wbpSt = const Value.absent(),
    this.wbpTr = const Value.absent(),
    this.wbpRn = const Value.absent(),
    this.wbpSn = const Value.absent(),
    this.wbpTn = const Value.absent(),
    this.wbpR = const Value.absent(),
    this.wbpS = const Value.absent(),
    this.wbpT = const Value.absent(),
    this.wbpN = const Value.absent(),
    this.lwbpRs = const Value.absent(),
    this.lwbpSt = const Value.absent(),
    this.lwbpTr = const Value.absent(),
    this.lwbpRn = const Value.absent(),
    this.lwbpSn = const Value.absent(),
    this.lwbpTn = const Value.absent(),
    this.lwbpR = const Value.absent(),
    this.lwbpS = const Value.absent(),
    this.lwbpT = const Value.absent(),
    this.lwbpN = const Value.absent(),
    this.arusMaxPerFasa = const Value.absent(),
    this.pembebananKva = const Value.absent(),
    this.pembebananKw = const Value.absent(),
    this.persentaseBeban = const Value.absent(),
    this.kategoriBeban = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : gardu = Value(gardu);
  static Insertable<MasterGardusData> custom({
    Expression<String>? ulp,
    Expression<String>? gardu,
    Expression<String>? alamat,
    Expression<String>? penyulang,
    Expression<String>? section,
    Expression<String>? jenisGardu,
    Expression<String>? merk,
    Expression<String>? kapasitasKva,
    Expression<String>? noSeri,
    Expression<String>? tahunTrafo,
    Expression<String>? typeSeal,
    Expression<String>? beratTrafo,
    Expression<String>? volumeMinyak,
    Expression<String>? merkPhbTr,
    Expression<String>? nomorSeriPhbTr,
    Expression<String>? tahunPhbTr,
    Expression<String>? jamUkurWbp,
    Expression<String>? tanggalPengukuran,
    Expression<String>? kepemilikan,
    Expression<String>? wbpRs,
    Expression<String>? wbpSt,
    Expression<String>? wbpTr,
    Expression<String>? wbpRn,
    Expression<String>? wbpSn,
    Expression<String>? wbpTn,
    Expression<String>? wbpR,
    Expression<String>? wbpS,
    Expression<String>? wbpT,
    Expression<String>? wbpN,
    Expression<String>? lwbpRs,
    Expression<String>? lwbpSt,
    Expression<String>? lwbpTr,
    Expression<String>? lwbpRn,
    Expression<String>? lwbpSn,
    Expression<String>? lwbpTn,
    Expression<String>? lwbpR,
    Expression<String>? lwbpS,
    Expression<String>? lwbpT,
    Expression<String>? lwbpN,
    Expression<String>? arusMaxPerFasa,
    Expression<String>? pembebananKva,
    Expression<String>? pembebananKw,
    Expression<String>? persentaseBeban,
    Expression<String>? kategoriBeban,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (ulp != null) 'ulp': ulp,
      if (gardu != null) 'gardu': gardu,
      if (alamat != null) 'alamat': alamat,
      if (penyulang != null) 'penyulang': penyulang,
      if (section != null) 'section': section,
      if (jenisGardu != null) 'jenis_gardu': jenisGardu,
      if (merk != null) 'merk': merk,
      if (kapasitasKva != null) 'kapasitas_kva': kapasitasKva,
      if (noSeri != null) 'no_seri': noSeri,
      if (tahunTrafo != null) 'tahun_trafo': tahunTrafo,
      if (typeSeal != null) 'type_seal': typeSeal,
      if (beratTrafo != null) 'berat_trafo': beratTrafo,
      if (volumeMinyak != null) 'volume_minyak': volumeMinyak,
      if (merkPhbTr != null) 'merk_phb_tr': merkPhbTr,
      if (nomorSeriPhbTr != null) 'nomor_seri_phb_tr': nomorSeriPhbTr,
      if (tahunPhbTr != null) 'tahun_phb_tr': tahunPhbTr,
      if (jamUkurWbp != null) 'jam_ukur_wbp': jamUkurWbp,
      if (tanggalPengukuran != null) 'tanggal_pengukuran': tanggalPengukuran,
      if (kepemilikan != null) 'kepemilikan': kepemilikan,
      if (wbpRs != null) 'wbp_rs': wbpRs,
      if (wbpSt != null) 'wbp_st': wbpSt,
      if (wbpTr != null) 'wbp_tr': wbpTr,
      if (wbpRn != null) 'wbp_rn': wbpRn,
      if (wbpSn != null) 'wbp_sn': wbpSn,
      if (wbpTn != null) 'wbp_tn': wbpTn,
      if (wbpR != null) 'wbp_r': wbpR,
      if (wbpS != null) 'wbp_s': wbpS,
      if (wbpT != null) 'wbp_t': wbpT,
      if (wbpN != null) 'wbp_n': wbpN,
      if (lwbpRs != null) 'lwbp_rs': lwbpRs,
      if (lwbpSt != null) 'lwbp_st': lwbpSt,
      if (lwbpTr != null) 'lwbp_tr': lwbpTr,
      if (lwbpRn != null) 'lwbp_rn': lwbpRn,
      if (lwbpSn != null) 'lwbp_sn': lwbpSn,
      if (lwbpTn != null) 'lwbp_tn': lwbpTn,
      if (lwbpR != null) 'lwbp_r': lwbpR,
      if (lwbpS != null) 'lwbp_s': lwbpS,
      if (lwbpT != null) 'lwbp_t': lwbpT,
      if (lwbpN != null) 'lwbp_n': lwbpN,
      if (arusMaxPerFasa != null) 'arus_max_per_fasa': arusMaxPerFasa,
      if (pembebananKva != null) 'pembebanan_kva': pembebananKva,
      if (pembebananKw != null) 'pembebanan_kw': pembebananKw,
      if (persentaseBeban != null) 'persentase_beban': persentaseBeban,
      if (kategoriBeban != null) 'kategori_beban': kategoriBeban,
      if (rowid != null) 'rowid': rowid,
    });
  }

  MasterGardusCompanion copyWith(
      {Value<String>? ulp,
      Value<String>? gardu,
      Value<String>? alamat,
      Value<String>? penyulang,
      Value<String>? section,
      Value<String>? jenisGardu,
      Value<String>? merk,
      Value<String>? kapasitasKva,
      Value<String>? noSeri,
      Value<String>? tahunTrafo,
      Value<String>? typeSeal,
      Value<String>? beratTrafo,
      Value<String>? volumeMinyak,
      Value<String>? merkPhbTr,
      Value<String>? nomorSeriPhbTr,
      Value<String>? tahunPhbTr,
      Value<String>? jamUkurWbp,
      Value<String>? tanggalPengukuran,
      Value<String>? kepemilikan,
      Value<String>? wbpRs,
      Value<String>? wbpSt,
      Value<String>? wbpTr,
      Value<String>? wbpRn,
      Value<String>? wbpSn,
      Value<String>? wbpTn,
      Value<String>? wbpR,
      Value<String>? wbpS,
      Value<String>? wbpT,
      Value<String>? wbpN,
      Value<String>? lwbpRs,
      Value<String>? lwbpSt,
      Value<String>? lwbpTr,
      Value<String>? lwbpRn,
      Value<String>? lwbpSn,
      Value<String>? lwbpTn,
      Value<String>? lwbpR,
      Value<String>? lwbpS,
      Value<String>? lwbpT,
      Value<String>? lwbpN,
      Value<String>? arusMaxPerFasa,
      Value<String>? pembebananKva,
      Value<String>? pembebananKw,
      Value<String>? persentaseBeban,
      Value<String>? kategoriBeban,
      Value<int>? rowid}) {
    return MasterGardusCompanion(
      ulp: ulp ?? this.ulp,
      gardu: gardu ?? this.gardu,
      alamat: alamat ?? this.alamat,
      penyulang: penyulang ?? this.penyulang,
      section: section ?? this.section,
      jenisGardu: jenisGardu ?? this.jenisGardu,
      merk: merk ?? this.merk,
      kapasitasKva: kapasitasKva ?? this.kapasitasKva,
      noSeri: noSeri ?? this.noSeri,
      tahunTrafo: tahunTrafo ?? this.tahunTrafo,
      typeSeal: typeSeal ?? this.typeSeal,
      beratTrafo: beratTrafo ?? this.beratTrafo,
      volumeMinyak: volumeMinyak ?? this.volumeMinyak,
      merkPhbTr: merkPhbTr ?? this.merkPhbTr,
      nomorSeriPhbTr: nomorSeriPhbTr ?? this.nomorSeriPhbTr,
      tahunPhbTr: tahunPhbTr ?? this.tahunPhbTr,
      jamUkurWbp: jamUkurWbp ?? this.jamUkurWbp,
      tanggalPengukuran: tanggalPengukuran ?? this.tanggalPengukuran,
      kepemilikan: kepemilikan ?? this.kepemilikan,
      wbpRs: wbpRs ?? this.wbpRs,
      wbpSt: wbpSt ?? this.wbpSt,
      wbpTr: wbpTr ?? this.wbpTr,
      wbpRn: wbpRn ?? this.wbpRn,
      wbpSn: wbpSn ?? this.wbpSn,
      wbpTn: wbpTn ?? this.wbpTn,
      wbpR: wbpR ?? this.wbpR,
      wbpS: wbpS ?? this.wbpS,
      wbpT: wbpT ?? this.wbpT,
      wbpN: wbpN ?? this.wbpN,
      lwbpRs: lwbpRs ?? this.lwbpRs,
      lwbpSt: lwbpSt ?? this.lwbpSt,
      lwbpTr: lwbpTr ?? this.lwbpTr,
      lwbpRn: lwbpRn ?? this.lwbpRn,
      lwbpSn: lwbpSn ?? this.lwbpSn,
      lwbpTn: lwbpTn ?? this.lwbpTn,
      lwbpR: lwbpR ?? this.lwbpR,
      lwbpS: lwbpS ?? this.lwbpS,
      lwbpT: lwbpT ?? this.lwbpT,
      lwbpN: lwbpN ?? this.lwbpN,
      arusMaxPerFasa: arusMaxPerFasa ?? this.arusMaxPerFasa,
      pembebananKva: pembebananKva ?? this.pembebananKva,
      pembebananKw: pembebananKw ?? this.pembebananKw,
      persentaseBeban: persentaseBeban ?? this.persentaseBeban,
      kategoriBeban: kategoriBeban ?? this.kategoriBeban,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (ulp.present) {
      map['ulp'] = Variable<String>(ulp.value);
    }
    if (gardu.present) {
      map['gardu'] = Variable<String>(gardu.value);
    }
    if (alamat.present) {
      map['alamat'] = Variable<String>(alamat.value);
    }
    if (penyulang.present) {
      map['penyulang'] = Variable<String>(penyulang.value);
    }
    if (section.present) {
      map['section'] = Variable<String>(section.value);
    }
    if (jenisGardu.present) {
      map['jenis_gardu'] = Variable<String>(jenisGardu.value);
    }
    if (merk.present) {
      map['merk'] = Variable<String>(merk.value);
    }
    if (kapasitasKva.present) {
      map['kapasitas_kva'] = Variable<String>(kapasitasKva.value);
    }
    if (noSeri.present) {
      map['no_seri'] = Variable<String>(noSeri.value);
    }
    if (tahunTrafo.present) {
      map['tahun_trafo'] = Variable<String>(tahunTrafo.value);
    }
    if (typeSeal.present) {
      map['type_seal'] = Variable<String>(typeSeal.value);
    }
    if (beratTrafo.present) {
      map['berat_trafo'] = Variable<String>(beratTrafo.value);
    }
    if (volumeMinyak.present) {
      map['volume_minyak'] = Variable<String>(volumeMinyak.value);
    }
    if (merkPhbTr.present) {
      map['merk_phb_tr'] = Variable<String>(merkPhbTr.value);
    }
    if (nomorSeriPhbTr.present) {
      map['nomor_seri_phb_tr'] = Variable<String>(nomorSeriPhbTr.value);
    }
    if (tahunPhbTr.present) {
      map['tahun_phb_tr'] = Variable<String>(tahunPhbTr.value);
    }
    if (jamUkurWbp.present) {
      map['jam_ukur_wbp'] = Variable<String>(jamUkurWbp.value);
    }
    if (tanggalPengukuran.present) {
      map['tanggal_pengukuran'] = Variable<String>(tanggalPengukuran.value);
    }
    if (kepemilikan.present) {
      map['kepemilikan'] = Variable<String>(kepemilikan.value);
    }
    if (wbpRs.present) {
      map['wbp_rs'] = Variable<String>(wbpRs.value);
    }
    if (wbpSt.present) {
      map['wbp_st'] = Variable<String>(wbpSt.value);
    }
    if (wbpTr.present) {
      map['wbp_tr'] = Variable<String>(wbpTr.value);
    }
    if (wbpRn.present) {
      map['wbp_rn'] = Variable<String>(wbpRn.value);
    }
    if (wbpSn.present) {
      map['wbp_sn'] = Variable<String>(wbpSn.value);
    }
    if (wbpTn.present) {
      map['wbp_tn'] = Variable<String>(wbpTn.value);
    }
    if (wbpR.present) {
      map['wbp_r'] = Variable<String>(wbpR.value);
    }
    if (wbpS.present) {
      map['wbp_s'] = Variable<String>(wbpS.value);
    }
    if (wbpT.present) {
      map['wbp_t'] = Variable<String>(wbpT.value);
    }
    if (wbpN.present) {
      map['wbp_n'] = Variable<String>(wbpN.value);
    }
    if (lwbpRs.present) {
      map['lwbp_rs'] = Variable<String>(lwbpRs.value);
    }
    if (lwbpSt.present) {
      map['lwbp_st'] = Variable<String>(lwbpSt.value);
    }
    if (lwbpTr.present) {
      map['lwbp_tr'] = Variable<String>(lwbpTr.value);
    }
    if (lwbpRn.present) {
      map['lwbp_rn'] = Variable<String>(lwbpRn.value);
    }
    if (lwbpSn.present) {
      map['lwbp_sn'] = Variable<String>(lwbpSn.value);
    }
    if (lwbpTn.present) {
      map['lwbp_tn'] = Variable<String>(lwbpTn.value);
    }
    if (lwbpR.present) {
      map['lwbp_r'] = Variable<String>(lwbpR.value);
    }
    if (lwbpS.present) {
      map['lwbp_s'] = Variable<String>(lwbpS.value);
    }
    if (lwbpT.present) {
      map['lwbp_t'] = Variable<String>(lwbpT.value);
    }
    if (lwbpN.present) {
      map['lwbp_n'] = Variable<String>(lwbpN.value);
    }
    if (arusMaxPerFasa.present) {
      map['arus_max_per_fasa'] = Variable<String>(arusMaxPerFasa.value);
    }
    if (pembebananKva.present) {
      map['pembebanan_kva'] = Variable<String>(pembebananKva.value);
    }
    if (pembebananKw.present) {
      map['pembebanan_kw'] = Variable<String>(pembebananKw.value);
    }
    if (persentaseBeban.present) {
      map['persentase_beban'] = Variable<String>(persentaseBeban.value);
    }
    if (kategoriBeban.present) {
      map['kategori_beban'] = Variable<String>(kategoriBeban.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MasterGardusCompanion(')
          ..write('ulp: $ulp, ')
          ..write('gardu: $gardu, ')
          ..write('alamat: $alamat, ')
          ..write('penyulang: $penyulang, ')
          ..write('section: $section, ')
          ..write('jenisGardu: $jenisGardu, ')
          ..write('merk: $merk, ')
          ..write('kapasitasKva: $kapasitasKva, ')
          ..write('noSeri: $noSeri, ')
          ..write('tahunTrafo: $tahunTrafo, ')
          ..write('typeSeal: $typeSeal, ')
          ..write('beratTrafo: $beratTrafo, ')
          ..write('volumeMinyak: $volumeMinyak, ')
          ..write('merkPhbTr: $merkPhbTr, ')
          ..write('nomorSeriPhbTr: $nomorSeriPhbTr, ')
          ..write('tahunPhbTr: $tahunPhbTr, ')
          ..write('jamUkurWbp: $jamUkurWbp, ')
          ..write('tanggalPengukuran: $tanggalPengukuran, ')
          ..write('kepemilikan: $kepemilikan, ')
          ..write('wbpRs: $wbpRs, ')
          ..write('wbpSt: $wbpSt, ')
          ..write('wbpTr: $wbpTr, ')
          ..write('wbpRn: $wbpRn, ')
          ..write('wbpSn: $wbpSn, ')
          ..write('wbpTn: $wbpTn, ')
          ..write('wbpR: $wbpR, ')
          ..write('wbpS: $wbpS, ')
          ..write('wbpT: $wbpT, ')
          ..write('wbpN: $wbpN, ')
          ..write('lwbpRs: $lwbpRs, ')
          ..write('lwbpSt: $lwbpSt, ')
          ..write('lwbpTr: $lwbpTr, ')
          ..write('lwbpRn: $lwbpRn, ')
          ..write('lwbpSn: $lwbpSn, ')
          ..write('lwbpTn: $lwbpTn, ')
          ..write('lwbpR: $lwbpR, ')
          ..write('lwbpS: $lwbpS, ')
          ..write('lwbpT: $lwbpT, ')
          ..write('lwbpN: $lwbpN, ')
          ..write('arusMaxPerFasa: $arusMaxPerFasa, ')
          ..write('pembebananKva: $pembebananKva, ')
          ..write('pembebananKw: $pembebananKw, ')
          ..write('persentaseBeban: $persentaseBeban, ')
          ..write('kategoriBeban: $kategoriBeban, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $GarduOutboxesTable extends GarduOutboxes
    with TableInfo<$GarduOutboxesTable, GarduOutbox> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $GarduOutboxesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _garduMeta = const VerificationMeta('gardu');
  @override
  late final GeneratedColumn<String> gardu = GeneratedColumn<String>(
      'gardu', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _ulpMeta = const VerificationMeta('ulp');
  @override
  late final GeneratedColumn<String> ulp = GeneratedColumn<String>(
      'ulp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _perubahanJsonMeta =
      const VerificationMeta('perubahanJson');
  @override
  late final GeneratedColumn<String> perubahanJson = GeneratedColumn<String>(
      'perubahan_json', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('{}'));
  static const VerificationMeta _diubahOlehMeta =
      const VerificationMeta('diubahOleh');
  @override
  late final GeneratedColumn<String> diubahOleh = GeneratedColumn<String>(
      'diubah_oleh', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _diubahPadaMeta =
      const VerificationMeta('diubahPada');
  @override
  late final GeneratedColumn<String> diubahPada = GeneratedColumn<String>(
      'diubah_pada', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _percobaanMeta =
      const VerificationMeta('percobaan');
  @override
  late final GeneratedColumn<int> percobaan = GeneratedColumn<int>(
      'percobaan', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _pesanGagalMeta =
      const VerificationMeta('pesanGagal');
  @override
  late final GeneratedColumn<String> pesanGagal = GeneratedColumn<String>(
      'pesan_gagal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns => [
        gardu,
        ulp,
        perubahanJson,
        diubahOleh,
        diubahPada,
        status,
        percobaan,
        pesanGagal
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'gardu_outbox';
  @override
  VerificationContext validateIntegrity(Insertable<GarduOutbox> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('gardu')) {
      context.handle(
          _garduMeta, gardu.isAcceptableOrUnknown(data['gardu']!, _garduMeta));
    } else if (isInserting) {
      context.missing(_garduMeta);
    }
    if (data.containsKey('ulp')) {
      context.handle(
          _ulpMeta, ulp.isAcceptableOrUnknown(data['ulp']!, _ulpMeta));
    }
    if (data.containsKey('perubahan_json')) {
      context.handle(
          _perubahanJsonMeta,
          perubahanJson.isAcceptableOrUnknown(
              data['perubahan_json']!, _perubahanJsonMeta));
    }
    if (data.containsKey('diubah_oleh')) {
      context.handle(
          _diubahOlehMeta,
          diubahOleh.isAcceptableOrUnknown(
              data['diubah_oleh']!, _diubahOlehMeta));
    }
    if (data.containsKey('diubah_pada')) {
      context.handle(
          _diubahPadaMeta,
          diubahPada.isAcceptableOrUnknown(
              data['diubah_pada']!, _diubahPadaMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('percobaan')) {
      context.handle(_percobaanMeta,
          percobaan.isAcceptableOrUnknown(data['percobaan']!, _percobaanMeta));
    }
    if (data.containsKey('pesan_gagal')) {
      context.handle(
          _pesanGagalMeta,
          pesanGagal.isAcceptableOrUnknown(
              data['pesan_gagal']!, _pesanGagalMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {gardu};
  @override
  GarduOutbox map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return GarduOutbox(
      gardu: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}gardu'])!,
      ulp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ulp'])!,
      perubahanJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}perubahan_json'])!,
      diubahOleh: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}diubah_oleh'])!,
      diubahPada: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}diubah_pada'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      percobaan: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}percobaan'])!,
      pesanGagal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}pesan_gagal'])!,
    );
  }

  @override
  $GarduOutboxesTable createAlias(String alias) {
    return $GarduOutboxesTable(attachedDatabase, alias);
  }
}

class GarduOutbox extends DataClass implements Insertable<GarduOutbox> {
  final String gardu;
  final String ulp;
  final String perubahanJson;
  final String diubahOleh;
  final String diubahPada;
  final String status;
  final int percobaan;
  final String pesanGagal;
  const GarduOutbox(
      {required this.gardu,
      required this.ulp,
      required this.perubahanJson,
      required this.diubahOleh,
      required this.diubahPada,
      required this.status,
      required this.percobaan,
      required this.pesanGagal});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['gardu'] = Variable<String>(gardu);
    map['ulp'] = Variable<String>(ulp);
    map['perubahan_json'] = Variable<String>(perubahanJson);
    map['diubah_oleh'] = Variable<String>(diubahOleh);
    map['diubah_pada'] = Variable<String>(diubahPada);
    map['status'] = Variable<String>(status);
    map['percobaan'] = Variable<int>(percobaan);
    map['pesan_gagal'] = Variable<String>(pesanGagal);
    return map;
  }

  GarduOutboxesCompanion toCompanion(bool nullToAbsent) {
    return GarduOutboxesCompanion(
      gardu: Value(gardu),
      ulp: Value(ulp),
      perubahanJson: Value(perubahanJson),
      diubahOleh: Value(diubahOleh),
      diubahPada: Value(diubahPada),
      status: Value(status),
      percobaan: Value(percobaan),
      pesanGagal: Value(pesanGagal),
    );
  }

  factory GarduOutbox.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return GarduOutbox(
      gardu: serializer.fromJson<String>(json['gardu']),
      ulp: serializer.fromJson<String>(json['ulp']),
      perubahanJson: serializer.fromJson<String>(json['perubahanJson']),
      diubahOleh: serializer.fromJson<String>(json['diubahOleh']),
      diubahPada: serializer.fromJson<String>(json['diubahPada']),
      status: serializer.fromJson<String>(json['status']),
      percobaan: serializer.fromJson<int>(json['percobaan']),
      pesanGagal: serializer.fromJson<String>(json['pesanGagal']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'gardu': serializer.toJson<String>(gardu),
      'ulp': serializer.toJson<String>(ulp),
      'perubahanJson': serializer.toJson<String>(perubahanJson),
      'diubahOleh': serializer.toJson<String>(diubahOleh),
      'diubahPada': serializer.toJson<String>(diubahPada),
      'status': serializer.toJson<String>(status),
      'percobaan': serializer.toJson<int>(percobaan),
      'pesanGagal': serializer.toJson<String>(pesanGagal),
    };
  }

  GarduOutbox copyWith(
          {String? gardu,
          String? ulp,
          String? perubahanJson,
          String? diubahOleh,
          String? diubahPada,
          String? status,
          int? percobaan,
          String? pesanGagal}) =>
      GarduOutbox(
        gardu: gardu ?? this.gardu,
        ulp: ulp ?? this.ulp,
        perubahanJson: perubahanJson ?? this.perubahanJson,
        diubahOleh: diubahOleh ?? this.diubahOleh,
        diubahPada: diubahPada ?? this.diubahPada,
        status: status ?? this.status,
        percobaan: percobaan ?? this.percobaan,
        pesanGagal: pesanGagal ?? this.pesanGagal,
      );
  GarduOutbox copyWithCompanion(GarduOutboxesCompanion data) {
    return GarduOutbox(
      gardu: data.gardu.present ? data.gardu.value : this.gardu,
      ulp: data.ulp.present ? data.ulp.value : this.ulp,
      perubahanJson: data.perubahanJson.present
          ? data.perubahanJson.value
          : this.perubahanJson,
      diubahOleh:
          data.diubahOleh.present ? data.diubahOleh.value : this.diubahOleh,
      diubahPada:
          data.diubahPada.present ? data.diubahPada.value : this.diubahPada,
      status: data.status.present ? data.status.value : this.status,
      percobaan: data.percobaan.present ? data.percobaan.value : this.percobaan,
      pesanGagal:
          data.pesanGagal.present ? data.pesanGagal.value : this.pesanGagal,
    );
  }

  @override
  String toString() {
    return (StringBuffer('GarduOutbox(')
          ..write('gardu: $gardu, ')
          ..write('ulp: $ulp, ')
          ..write('perubahanJson: $perubahanJson, ')
          ..write('diubahOleh: $diubahOleh, ')
          ..write('diubahPada: $diubahPada, ')
          ..write('status: $status, ')
          ..write('percobaan: $percobaan, ')
          ..write('pesanGagal: $pesanGagal')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(gardu, ulp, perubahanJson, diubahOleh,
      diubahPada, status, percobaan, pesanGagal);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GarduOutbox &&
          other.gardu == this.gardu &&
          other.ulp == this.ulp &&
          other.perubahanJson == this.perubahanJson &&
          other.diubahOleh == this.diubahOleh &&
          other.diubahPada == this.diubahPada &&
          other.status == this.status &&
          other.percobaan == this.percobaan &&
          other.pesanGagal == this.pesanGagal);
}

class GarduOutboxesCompanion extends UpdateCompanion<GarduOutbox> {
  final Value<String> gardu;
  final Value<String> ulp;
  final Value<String> perubahanJson;
  final Value<String> diubahOleh;
  final Value<String> diubahPada;
  final Value<String> status;
  final Value<int> percobaan;
  final Value<String> pesanGagal;
  final Value<int> rowid;
  const GarduOutboxesCompanion({
    this.gardu = const Value.absent(),
    this.ulp = const Value.absent(),
    this.perubahanJson = const Value.absent(),
    this.diubahOleh = const Value.absent(),
    this.diubahPada = const Value.absent(),
    this.status = const Value.absent(),
    this.percobaan = const Value.absent(),
    this.pesanGagal = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  GarduOutboxesCompanion.insert({
    required String gardu,
    this.ulp = const Value.absent(),
    this.perubahanJson = const Value.absent(),
    this.diubahOleh = const Value.absent(),
    this.diubahPada = const Value.absent(),
    this.status = const Value.absent(),
    this.percobaan = const Value.absent(),
    this.pesanGagal = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : gardu = Value(gardu);
  static Insertable<GarduOutbox> custom({
    Expression<String>? gardu,
    Expression<String>? ulp,
    Expression<String>? perubahanJson,
    Expression<String>? diubahOleh,
    Expression<String>? diubahPada,
    Expression<String>? status,
    Expression<int>? percobaan,
    Expression<String>? pesanGagal,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (gardu != null) 'gardu': gardu,
      if (ulp != null) 'ulp': ulp,
      if (perubahanJson != null) 'perubahan_json': perubahanJson,
      if (diubahOleh != null) 'diubah_oleh': diubahOleh,
      if (diubahPada != null) 'diubah_pada': diubahPada,
      if (status != null) 'status': status,
      if (percobaan != null) 'percobaan': percobaan,
      if (pesanGagal != null) 'pesan_gagal': pesanGagal,
      if (rowid != null) 'rowid': rowid,
    });
  }

  GarduOutboxesCompanion copyWith(
      {Value<String>? gardu,
      Value<String>? ulp,
      Value<String>? perubahanJson,
      Value<String>? diubahOleh,
      Value<String>? diubahPada,
      Value<String>? status,
      Value<int>? percobaan,
      Value<String>? pesanGagal,
      Value<int>? rowid}) {
    return GarduOutboxesCompanion(
      gardu: gardu ?? this.gardu,
      ulp: ulp ?? this.ulp,
      perubahanJson: perubahanJson ?? this.perubahanJson,
      diubahOleh: diubahOleh ?? this.diubahOleh,
      diubahPada: diubahPada ?? this.diubahPada,
      status: status ?? this.status,
      percobaan: percobaan ?? this.percobaan,
      pesanGagal: pesanGagal ?? this.pesanGagal,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (gardu.present) {
      map['gardu'] = Variable<String>(gardu.value);
    }
    if (ulp.present) {
      map['ulp'] = Variable<String>(ulp.value);
    }
    if (perubahanJson.present) {
      map['perubahan_json'] = Variable<String>(perubahanJson.value);
    }
    if (diubahOleh.present) {
      map['diubah_oleh'] = Variable<String>(diubahOleh.value);
    }
    if (diubahPada.present) {
      map['diubah_pada'] = Variable<String>(diubahPada.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (percobaan.present) {
      map['percobaan'] = Variable<int>(percobaan.value);
    }
    if (pesanGagal.present) {
      map['pesan_gagal'] = Variable<String>(pesanGagal.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('GarduOutboxesCompanion(')
          ..write('gardu: $gardu, ')
          ..write('ulp: $ulp, ')
          ..write('perubahanJson: $perubahanJson, ')
          ..write('diubahOleh: $diubahOleh, ')
          ..write('diubahPada: $diubahPada, ')
          ..write('status: $status, ')
          ..write('percobaan: $percobaan, ')
          ..write('pesanGagal: $pesanGagal, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $InsGarduHeadersTable extends InsGarduHeaders
    with TableInfo<$InsGarduHeadersTable, InsGarduHeader> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $InsGarduHeadersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localIdMeta =
      const VerificationMeta('localId');
  @override
  late final GeneratedColumn<String> localId = GeneratedColumn<String>(
      'local_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _kodeHeaderMeta =
      const VerificationMeta('kodeHeader');
  @override
  late final GeneratedColumn<String> kodeHeader = GeneratedColumn<String>(
      'kode_header', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _ulpMeta = const VerificationMeta('ulp');
  @override
  late final GeneratedColumn<String> ulp = GeneratedColumn<String>(
      'ulp', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _hariMeta = const VerificationMeta('hari');
  @override
  late final GeneratedColumn<String> hari = GeneratedColumn<String>(
      'hari', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tanggalMeta =
      const VerificationMeta('tanggal');
  @override
  late final GeneratedColumn<String> tanggal = GeneratedColumn<String>(
      'tanggal', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _koordinatAwalMeta =
      const VerificationMeta('koordinatAwal');
  @override
  late final GeneratedColumn<String> koordinatAwal = GeneratedColumn<String>(
      'koordinat_awal', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _koordinatAkhirMeta =
      const VerificationMeta('koordinatAkhir');
  @override
  late final GeneratedColumn<String> koordinatAkhir = GeneratedColumn<String>(
      'koordinat_akhir', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _kmAwalMeta = const VerificationMeta('kmAwal');
  @override
  late final GeneratedColumn<String> kmAwal = GeneratedColumn<String>(
      'km_awal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kmAkhirMeta =
      const VerificationMeta('kmAkhir');
  @override
  late final GeneratedColumn<String> kmAkhir = GeneratedColumn<String>(
      'km_akhir', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _kendalaMeta =
      const VerificationMeta('kendala');
  @override
  late final GeneratedColumn<String> kendala = GeneratedColumn<String>(
      'kendala', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _inputByMeta =
      const VerificationMeta('inputBy');
  @override
  late final GeneratedColumn<String> inputBy = GeneratedColumn<String>(
      'input_by', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _dibuatPadaMeta =
      const VerificationMeta('dibuatPada');
  @override
  late final GeneratedColumn<String> dibuatPada = GeneratedColumn<String>(
      'dibuat_pada', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('draft'));
  static const VerificationMeta _pesanGagalMeta =
      const VerificationMeta('pesanGagal');
  @override
  late final GeneratedColumn<String> pesanGagal = GeneratedColumn<String>(
      'pesan_gagal', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  @override
  List<GeneratedColumn> get $columns => [
        localId,
        kodeHeader,
        ulp,
        hari,
        tanggal,
        koordinatAwal,
        koordinatAkhir,
        kmAwal,
        kmAkhir,
        kendala,
        inputBy,
        dibuatPada,
        status,
        pesanGagal
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'ins_gardu_header';
  @override
  VerificationContext validateIntegrity(Insertable<InsGarduHeader> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_id')) {
      context.handle(_localIdMeta,
          localId.isAcceptableOrUnknown(data['local_id']!, _localIdMeta));
    } else if (isInserting) {
      context.missing(_localIdMeta);
    }
    if (data.containsKey('kode_header')) {
      context.handle(
          _kodeHeaderMeta,
          kodeHeader.isAcceptableOrUnknown(
              data['kode_header']!, _kodeHeaderMeta));
    }
    if (data.containsKey('ulp')) {
      context.handle(
          _ulpMeta, ulp.isAcceptableOrUnknown(data['ulp']!, _ulpMeta));
    }
    if (data.containsKey('hari')) {
      context.handle(
          _hariMeta, hari.isAcceptableOrUnknown(data['hari']!, _hariMeta));
    }
    if (data.containsKey('tanggal')) {
      context.handle(_tanggalMeta,
          tanggal.isAcceptableOrUnknown(data['tanggal']!, _tanggalMeta));
    } else if (isInserting) {
      context.missing(_tanggalMeta);
    }
    if (data.containsKey('koordinat_awal')) {
      context.handle(
          _koordinatAwalMeta,
          koordinatAwal.isAcceptableOrUnknown(
              data['koordinat_awal']!, _koordinatAwalMeta));
    } else if (isInserting) {
      context.missing(_koordinatAwalMeta);
    }
    if (data.containsKey('koordinat_akhir')) {
      context.handle(
          _koordinatAkhirMeta,
          koordinatAkhir.isAcceptableOrUnknown(
              data['koordinat_akhir']!, _koordinatAkhirMeta));
    } else if (isInserting) {
      context.missing(_koordinatAkhirMeta);
    }
    if (data.containsKey('km_awal')) {
      context.handle(_kmAwalMeta,
          kmAwal.isAcceptableOrUnknown(data['km_awal']!, _kmAwalMeta));
    }
    if (data.containsKey('km_akhir')) {
      context.handle(_kmAkhirMeta,
          kmAkhir.isAcceptableOrUnknown(data['km_akhir']!, _kmAkhirMeta));
    }
    if (data.containsKey('kendala')) {
      context.handle(_kendalaMeta,
          kendala.isAcceptableOrUnknown(data['kendala']!, _kendalaMeta));
    }
    if (data.containsKey('input_by')) {
      context.handle(_inputByMeta,
          inputBy.isAcceptableOrUnknown(data['input_by']!, _inputByMeta));
    }
    if (data.containsKey('dibuat_pada')) {
      context.handle(
          _dibuatPadaMeta,
          dibuatPada.isAcceptableOrUnknown(
              data['dibuat_pada']!, _dibuatPadaMeta));
    } else if (isInserting) {
      context.missing(_dibuatPadaMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('pesan_gagal')) {
      context.handle(
          _pesanGagalMeta,
          pesanGagal.isAcceptableOrUnknown(
              data['pesan_gagal']!, _pesanGagalMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localId};
  @override
  InsGarduHeader map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return InsGarduHeader(
      localId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_id'])!,
      kodeHeader: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kode_header'])!,
      ulp: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ulp'])!,
      hari: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}hari'])!,
      tanggal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tanggal'])!,
      koordinatAwal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}koordinat_awal'])!,
      koordinatAkhir: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}koordinat_akhir'])!,
      kmAwal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}km_awal'])!,
      kmAkhir: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}km_akhir'])!,
      kendala: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kendala'])!,
      inputBy: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}input_by'])!,
      dibuatPada: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}dibuat_pada'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      pesanGagal: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}pesan_gagal'])!,
    );
  }

  @override
  $InsGarduHeadersTable createAlias(String alias) {
    return $InsGarduHeadersTable(attachedDatabase, alias);
  }
}

class InsGarduHeader extends DataClass implements Insertable<InsGarduHeader> {
  final String localId;
  final String kodeHeader;
  final String ulp;
  final String hari;
  final String tanggal;
  final String koordinatAwal;
  final String koordinatAkhir;
  final String kmAwal;
  final String kmAkhir;
  final String kendala;
  final String inputBy;
  final String dibuatPada;
  final String status;
  final String pesanGagal;
  const InsGarduHeader(
      {required this.localId,
      required this.kodeHeader,
      required this.ulp,
      required this.hari,
      required this.tanggal,
      required this.koordinatAwal,
      required this.koordinatAkhir,
      required this.kmAwal,
      required this.kmAkhir,
      required this.kendala,
      required this.inputBy,
      required this.dibuatPada,
      required this.status,
      required this.pesanGagal});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_id'] = Variable<String>(localId);
    map['kode_header'] = Variable<String>(kodeHeader);
    map['ulp'] = Variable<String>(ulp);
    map['hari'] = Variable<String>(hari);
    map['tanggal'] = Variable<String>(tanggal);
    map['koordinat_awal'] = Variable<String>(koordinatAwal);
    map['koordinat_akhir'] = Variable<String>(koordinatAkhir);
    map['km_awal'] = Variable<String>(kmAwal);
    map['km_akhir'] = Variable<String>(kmAkhir);
    map['kendala'] = Variable<String>(kendala);
    map['input_by'] = Variable<String>(inputBy);
    map['dibuat_pada'] = Variable<String>(dibuatPada);
    map['status'] = Variable<String>(status);
    map['pesan_gagal'] = Variable<String>(pesanGagal);
    return map;
  }

  InsGarduHeadersCompanion toCompanion(bool nullToAbsent) {
    return InsGarduHeadersCompanion(
      localId: Value(localId),
      kodeHeader: Value(kodeHeader),
      ulp: Value(ulp),
      hari: Value(hari),
      tanggal: Value(tanggal),
      koordinatAwal: Value(koordinatAwal),
      koordinatAkhir: Value(koordinatAkhir),
      kmAwal: Value(kmAwal),
      kmAkhir: Value(kmAkhir),
      kendala: Value(kendala),
      inputBy: Value(inputBy),
      dibuatPada: Value(dibuatPada),
      status: Value(status),
      pesanGagal: Value(pesanGagal),
    );
  }

  factory InsGarduHeader.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return InsGarduHeader(
      localId: serializer.fromJson<String>(json['localId']),
      kodeHeader: serializer.fromJson<String>(json['kodeHeader']),
      ulp: serializer.fromJson<String>(json['ulp']),
      hari: serializer.fromJson<String>(json['hari']),
      tanggal: serializer.fromJson<String>(json['tanggal']),
      koordinatAwal: serializer.fromJson<String>(json['koordinatAwal']),
      koordinatAkhir: serializer.fromJson<String>(json['koordinatAkhir']),
      kmAwal: serializer.fromJson<String>(json['kmAwal']),
      kmAkhir: serializer.fromJson<String>(json['kmAkhir']),
      kendala: serializer.fromJson<String>(json['kendala']),
      inputBy: serializer.fromJson<String>(json['inputBy']),
      dibuatPada: serializer.fromJson<String>(json['dibuatPada']),
      status: serializer.fromJson<String>(json['status']),
      pesanGagal: serializer.fromJson<String>(json['pesanGagal']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localId': serializer.toJson<String>(localId),
      'kodeHeader': serializer.toJson<String>(kodeHeader),
      'ulp': serializer.toJson<String>(ulp),
      'hari': serializer.toJson<String>(hari),
      'tanggal': serializer.toJson<String>(tanggal),
      'koordinatAwal': serializer.toJson<String>(koordinatAwal),
      'koordinatAkhir': serializer.toJson<String>(koordinatAkhir),
      'kmAwal': serializer.toJson<String>(kmAwal),
      'kmAkhir': serializer.toJson<String>(kmAkhir),
      'kendala': serializer.toJson<String>(kendala),
      'inputBy': serializer.toJson<String>(inputBy),
      'dibuatPada': serializer.toJson<String>(dibuatPada),
      'status': serializer.toJson<String>(status),
      'pesanGagal': serializer.toJson<String>(pesanGagal),
    };
  }

  InsGarduHeader copyWith(
          {String? localId,
          String? kodeHeader,
          String? ulp,
          String? hari,
          String? tanggal,
          String? koordinatAwal,
          String? koordinatAkhir,
          String? kmAwal,
          String? kmAkhir,
          String? kendala,
          String? inputBy,
          String? dibuatPada,
          String? status,
          String? pesanGagal}) =>
      InsGarduHeader(
        localId: localId ?? this.localId,
        kodeHeader: kodeHeader ?? this.kodeHeader,
        ulp: ulp ?? this.ulp,
        hari: hari ?? this.hari,
        tanggal: tanggal ?? this.tanggal,
        koordinatAwal: koordinatAwal ?? this.koordinatAwal,
        koordinatAkhir: koordinatAkhir ?? this.koordinatAkhir,
        kmAwal: kmAwal ?? this.kmAwal,
        kmAkhir: kmAkhir ?? this.kmAkhir,
        kendala: kendala ?? this.kendala,
        inputBy: inputBy ?? this.inputBy,
        dibuatPada: dibuatPada ?? this.dibuatPada,
        status: status ?? this.status,
        pesanGagal: pesanGagal ?? this.pesanGagal,
      );
  InsGarduHeader copyWithCompanion(InsGarduHeadersCompanion data) {
    return InsGarduHeader(
      localId: data.localId.present ? data.localId.value : this.localId,
      kodeHeader:
          data.kodeHeader.present ? data.kodeHeader.value : this.kodeHeader,
      ulp: data.ulp.present ? data.ulp.value : this.ulp,
      hari: data.hari.present ? data.hari.value : this.hari,
      tanggal: data.tanggal.present ? data.tanggal.value : this.tanggal,
      koordinatAwal: data.koordinatAwal.present
          ? data.koordinatAwal.value
          : this.koordinatAwal,
      koordinatAkhir: data.koordinatAkhir.present
          ? data.koordinatAkhir.value
          : this.koordinatAkhir,
      kmAwal: data.kmAwal.present ? data.kmAwal.value : this.kmAwal,
      kmAkhir: data.kmAkhir.present ? data.kmAkhir.value : this.kmAkhir,
      kendala: data.kendala.present ? data.kendala.value : this.kendala,
      inputBy: data.inputBy.present ? data.inputBy.value : this.inputBy,
      dibuatPada:
          data.dibuatPada.present ? data.dibuatPada.value : this.dibuatPada,
      status: data.status.present ? data.status.value : this.status,
      pesanGagal:
          data.pesanGagal.present ? data.pesanGagal.value : this.pesanGagal,
    );
  }

  @override
  String toString() {
    return (StringBuffer('InsGarduHeader(')
          ..write('localId: $localId, ')
          ..write('kodeHeader: $kodeHeader, ')
          ..write('ulp: $ulp, ')
          ..write('hari: $hari, ')
          ..write('tanggal: $tanggal, ')
          ..write('koordinatAwal: $koordinatAwal, ')
          ..write('koordinatAkhir: $koordinatAkhir, ')
          ..write('kmAwal: $kmAwal, ')
          ..write('kmAkhir: $kmAkhir, ')
          ..write('kendala: $kendala, ')
          ..write('inputBy: $inputBy, ')
          ..write('dibuatPada: $dibuatPada, ')
          ..write('status: $status, ')
          ..write('pesanGagal: $pesanGagal')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      localId,
      kodeHeader,
      ulp,
      hari,
      tanggal,
      koordinatAwal,
      koordinatAkhir,
      kmAwal,
      kmAkhir,
      kendala,
      inputBy,
      dibuatPada,
      status,
      pesanGagal);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is InsGarduHeader &&
          other.localId == this.localId &&
          other.kodeHeader == this.kodeHeader &&
          other.ulp == this.ulp &&
          other.hari == this.hari &&
          other.tanggal == this.tanggal &&
          other.koordinatAwal == this.koordinatAwal &&
          other.koordinatAkhir == this.koordinatAkhir &&
          other.kmAwal == this.kmAwal &&
          other.kmAkhir == this.kmAkhir &&
          other.kendala == this.kendala &&
          other.inputBy == this.inputBy &&
          other.dibuatPada == this.dibuatPada &&
          other.status == this.status &&
          other.pesanGagal == this.pesanGagal);
}

class InsGarduHeadersCompanion extends UpdateCompanion<InsGarduHeader> {
  final Value<String> localId;
  final Value<String> kodeHeader;
  final Value<String> ulp;
  final Value<String> hari;
  final Value<String> tanggal;
  final Value<String> koordinatAwal;
  final Value<String> koordinatAkhir;
  final Value<String> kmAwal;
  final Value<String> kmAkhir;
  final Value<String> kendala;
  final Value<String> inputBy;
  final Value<String> dibuatPada;
  final Value<String> status;
  final Value<String> pesanGagal;
  final Value<int> rowid;
  const InsGarduHeadersCompanion({
    this.localId = const Value.absent(),
    this.kodeHeader = const Value.absent(),
    this.ulp = const Value.absent(),
    this.hari = const Value.absent(),
    this.tanggal = const Value.absent(),
    this.koordinatAwal = const Value.absent(),
    this.koordinatAkhir = const Value.absent(),
    this.kmAwal = const Value.absent(),
    this.kmAkhir = const Value.absent(),
    this.kendala = const Value.absent(),
    this.inputBy = const Value.absent(),
    this.dibuatPada = const Value.absent(),
    this.status = const Value.absent(),
    this.pesanGagal = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  InsGarduHeadersCompanion.insert({
    required String localId,
    this.kodeHeader = const Value.absent(),
    this.ulp = const Value.absent(),
    this.hari = const Value.absent(),
    required String tanggal,
    required String koordinatAwal,
    required String koordinatAkhir,
    this.kmAwal = const Value.absent(),
    this.kmAkhir = const Value.absent(),
    this.kendala = const Value.absent(),
    this.inputBy = const Value.absent(),
    required String dibuatPada,
    this.status = const Value.absent(),
    this.pesanGagal = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : localId = Value(localId),
        tanggal = Value(tanggal),
        koordinatAwal = Value(koordinatAwal),
        koordinatAkhir = Value(koordinatAkhir),
        dibuatPada = Value(dibuatPada);
  static Insertable<InsGarduHeader> custom({
    Expression<String>? localId,
    Expression<String>? kodeHeader,
    Expression<String>? ulp,
    Expression<String>? hari,
    Expression<String>? tanggal,
    Expression<String>? koordinatAwal,
    Expression<String>? koordinatAkhir,
    Expression<String>? kmAwal,
    Expression<String>? kmAkhir,
    Expression<String>? kendala,
    Expression<String>? inputBy,
    Expression<String>? dibuatPada,
    Expression<String>? status,
    Expression<String>? pesanGagal,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localId != null) 'local_id': localId,
      if (kodeHeader != null) 'kode_header': kodeHeader,
      if (ulp != null) 'ulp': ulp,
      if (hari != null) 'hari': hari,
      if (tanggal != null) 'tanggal': tanggal,
      if (koordinatAwal != null) 'koordinat_awal': koordinatAwal,
      if (koordinatAkhir != null) 'koordinat_akhir': koordinatAkhir,
      if (kmAwal != null) 'km_awal': kmAwal,
      if (kmAkhir != null) 'km_akhir': kmAkhir,
      if (kendala != null) 'kendala': kendala,
      if (inputBy != null) 'input_by': inputBy,
      if (dibuatPada != null) 'dibuat_pada': dibuatPada,
      if (status != null) 'status': status,
      if (pesanGagal != null) 'pesan_gagal': pesanGagal,
      if (rowid != null) 'rowid': rowid,
    });
  }

  InsGarduHeadersCompanion copyWith(
      {Value<String>? localId,
      Value<String>? kodeHeader,
      Value<String>? ulp,
      Value<String>? hari,
      Value<String>? tanggal,
      Value<String>? koordinatAwal,
      Value<String>? koordinatAkhir,
      Value<String>? kmAwal,
      Value<String>? kmAkhir,
      Value<String>? kendala,
      Value<String>? inputBy,
      Value<String>? dibuatPada,
      Value<String>? status,
      Value<String>? pesanGagal,
      Value<int>? rowid}) {
    return InsGarduHeadersCompanion(
      localId: localId ?? this.localId,
      kodeHeader: kodeHeader ?? this.kodeHeader,
      ulp: ulp ?? this.ulp,
      hari: hari ?? this.hari,
      tanggal: tanggal ?? this.tanggal,
      koordinatAwal: koordinatAwal ?? this.koordinatAwal,
      koordinatAkhir: koordinatAkhir ?? this.koordinatAkhir,
      kmAwal: kmAwal ?? this.kmAwal,
      kmAkhir: kmAkhir ?? this.kmAkhir,
      kendala: kendala ?? this.kendala,
      inputBy: inputBy ?? this.inputBy,
      dibuatPada: dibuatPada ?? this.dibuatPada,
      status: status ?? this.status,
      pesanGagal: pesanGagal ?? this.pesanGagal,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localId.present) {
      map['local_id'] = Variable<String>(localId.value);
    }
    if (kodeHeader.present) {
      map['kode_header'] = Variable<String>(kodeHeader.value);
    }
    if (ulp.present) {
      map['ulp'] = Variable<String>(ulp.value);
    }
    if (hari.present) {
      map['hari'] = Variable<String>(hari.value);
    }
    if (tanggal.present) {
      map['tanggal'] = Variable<String>(tanggal.value);
    }
    if (koordinatAwal.present) {
      map['koordinat_awal'] = Variable<String>(koordinatAwal.value);
    }
    if (koordinatAkhir.present) {
      map['koordinat_akhir'] = Variable<String>(koordinatAkhir.value);
    }
    if (kmAwal.present) {
      map['km_awal'] = Variable<String>(kmAwal.value);
    }
    if (kmAkhir.present) {
      map['km_akhir'] = Variable<String>(kmAkhir.value);
    }
    if (kendala.present) {
      map['kendala'] = Variable<String>(kendala.value);
    }
    if (inputBy.present) {
      map['input_by'] = Variable<String>(inputBy.value);
    }
    if (dibuatPada.present) {
      map['dibuat_pada'] = Variable<String>(dibuatPada.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (pesanGagal.present) {
      map['pesan_gagal'] = Variable<String>(pesanGagal.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('InsGarduHeadersCompanion(')
          ..write('localId: $localId, ')
          ..write('kodeHeader: $kodeHeader, ')
          ..write('ulp: $ulp, ')
          ..write('hari: $hari, ')
          ..write('tanggal: $tanggal, ')
          ..write('koordinatAwal: $koordinatAwal, ')
          ..write('koordinatAkhir: $koordinatAkhir, ')
          ..write('kmAwal: $kmAwal, ')
          ..write('kmAkhir: $kmAkhir, ')
          ..write('kendala: $kendala, ')
          ..write('inputBy: $inputBy, ')
          ..write('dibuatPada: $dibuatPada, ')
          ..write('status: $status, ')
          ..write('pesanGagal: $pesanGagal, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $InsGarduRealisasisTable extends InsGarduRealisasis
    with TableInfo<$InsGarduRealisasisTable, InsGarduRealisasi> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $InsGarduRealisasisTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localIdMeta =
      const VerificationMeta('localId');
  @override
  late final GeneratedColumn<String> localId = GeneratedColumn<String>(
      'local_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _localHeaderIdMeta =
      const VerificationMeta('localHeaderId');
  @override
  late final GeneratedColumn<String> localHeaderId = GeneratedColumn<String>(
      'local_header_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _kodePekerjaanGarduMeta =
      const VerificationMeta('kodePekerjaanGardu');
  @override
  late final GeneratedColumn<String> kodePekerjaanGardu =
      GeneratedColumn<String>('kode_pekerjaan_gardu', aliasedName, false,
          type: DriftSqlType.string,
          requiredDuringInsert: false,
          defaultValue: const Constant(''));
  static const VerificationMeta _nomorGarduMeta =
      const VerificationMeta('nomorGardu');
  @override
  late final GeneratedColumn<String> nomorGardu = GeneratedColumn<String>(
      'nomor_gardu', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _tierMeta = const VerificationMeta('tier');
  @override
  late final GeneratedColumn<String> tier = GeneratedColumn<String>(
      'tier', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _snapshotJsonMeta =
      const VerificationMeta('snapshotJson');
  @override
  late final GeneratedColumn<String> snapshotJson = GeneratedColumn<String>(
      'snapshot_json', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('draft'));
  @override
  List<GeneratedColumn> get $columns => [
        localId,
        localHeaderId,
        kodePekerjaanGardu,
        nomorGardu,
        tier,
        snapshotJson,
        status
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'ins_gardu_realisasi';
  @override
  VerificationContext validateIntegrity(Insertable<InsGarduRealisasi> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_id')) {
      context.handle(_localIdMeta,
          localId.isAcceptableOrUnknown(data['local_id']!, _localIdMeta));
    } else if (isInserting) {
      context.missing(_localIdMeta);
    }
    if (data.containsKey('local_header_id')) {
      context.handle(
          _localHeaderIdMeta,
          localHeaderId.isAcceptableOrUnknown(
              data['local_header_id']!, _localHeaderIdMeta));
    } else if (isInserting) {
      context.missing(_localHeaderIdMeta);
    }
    if (data.containsKey('kode_pekerjaan_gardu')) {
      context.handle(
          _kodePekerjaanGarduMeta,
          kodePekerjaanGardu.isAcceptableOrUnknown(
              data['kode_pekerjaan_gardu']!, _kodePekerjaanGarduMeta));
    }
    if (data.containsKey('nomor_gardu')) {
      context.handle(
          _nomorGarduMeta,
          nomorGardu.isAcceptableOrUnknown(
              data['nomor_gardu']!, _nomorGarduMeta));
    } else if (isInserting) {
      context.missing(_nomorGarduMeta);
    }
    if (data.containsKey('tier')) {
      context.handle(
          _tierMeta, tier.isAcceptableOrUnknown(data['tier']!, _tierMeta));
    }
    if (data.containsKey('snapshot_json')) {
      context.handle(
          _snapshotJsonMeta,
          snapshotJson.isAcceptableOrUnknown(
              data['snapshot_json']!, _snapshotJsonMeta));
    } else if (isInserting) {
      context.missing(_snapshotJsonMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localId};
  @override
  InsGarduRealisasi map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return InsGarduRealisasi(
      localId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_id'])!,
      localHeaderId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}local_header_id'])!,
      kodePekerjaanGardu: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}kode_pekerjaan_gardu'])!,
      nomorGardu: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}nomor_gardu'])!,
      tier: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tier'])!,
      snapshotJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}snapshot_json'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
    );
  }

  @override
  $InsGarduRealisasisTable createAlias(String alias) {
    return $InsGarduRealisasisTable(attachedDatabase, alias);
  }
}

class InsGarduRealisasi extends DataClass
    implements Insertable<InsGarduRealisasi> {
  final String localId;
  final String localHeaderId;
  final String kodePekerjaanGardu;
  final String nomorGardu;
  final String tier;
  final String snapshotJson;
  final String status;
  const InsGarduRealisasi(
      {required this.localId,
      required this.localHeaderId,
      required this.kodePekerjaanGardu,
      required this.nomorGardu,
      required this.tier,
      required this.snapshotJson,
      required this.status});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_id'] = Variable<String>(localId);
    map['local_header_id'] = Variable<String>(localHeaderId);
    map['kode_pekerjaan_gardu'] = Variable<String>(kodePekerjaanGardu);
    map['nomor_gardu'] = Variable<String>(nomorGardu);
    map['tier'] = Variable<String>(tier);
    map['snapshot_json'] = Variable<String>(snapshotJson);
    map['status'] = Variable<String>(status);
    return map;
  }

  InsGarduRealisasisCompanion toCompanion(bool nullToAbsent) {
    return InsGarduRealisasisCompanion(
      localId: Value(localId),
      localHeaderId: Value(localHeaderId),
      kodePekerjaanGardu: Value(kodePekerjaanGardu),
      nomorGardu: Value(nomorGardu),
      tier: Value(tier),
      snapshotJson: Value(snapshotJson),
      status: Value(status),
    );
  }

  factory InsGarduRealisasi.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return InsGarduRealisasi(
      localId: serializer.fromJson<String>(json['localId']),
      localHeaderId: serializer.fromJson<String>(json['localHeaderId']),
      kodePekerjaanGardu:
          serializer.fromJson<String>(json['kodePekerjaanGardu']),
      nomorGardu: serializer.fromJson<String>(json['nomorGardu']),
      tier: serializer.fromJson<String>(json['tier']),
      snapshotJson: serializer.fromJson<String>(json['snapshotJson']),
      status: serializer.fromJson<String>(json['status']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localId': serializer.toJson<String>(localId),
      'localHeaderId': serializer.toJson<String>(localHeaderId),
      'kodePekerjaanGardu': serializer.toJson<String>(kodePekerjaanGardu),
      'nomorGardu': serializer.toJson<String>(nomorGardu),
      'tier': serializer.toJson<String>(tier),
      'snapshotJson': serializer.toJson<String>(snapshotJson),
      'status': serializer.toJson<String>(status),
    };
  }

  InsGarduRealisasi copyWith(
          {String? localId,
          String? localHeaderId,
          String? kodePekerjaanGardu,
          String? nomorGardu,
          String? tier,
          String? snapshotJson,
          String? status}) =>
      InsGarduRealisasi(
        localId: localId ?? this.localId,
        localHeaderId: localHeaderId ?? this.localHeaderId,
        kodePekerjaanGardu: kodePekerjaanGardu ?? this.kodePekerjaanGardu,
        nomorGardu: nomorGardu ?? this.nomorGardu,
        tier: tier ?? this.tier,
        snapshotJson: snapshotJson ?? this.snapshotJson,
        status: status ?? this.status,
      );
  InsGarduRealisasi copyWithCompanion(InsGarduRealisasisCompanion data) {
    return InsGarduRealisasi(
      localId: data.localId.present ? data.localId.value : this.localId,
      localHeaderId: data.localHeaderId.present
          ? data.localHeaderId.value
          : this.localHeaderId,
      kodePekerjaanGardu: data.kodePekerjaanGardu.present
          ? data.kodePekerjaanGardu.value
          : this.kodePekerjaanGardu,
      nomorGardu:
          data.nomorGardu.present ? data.nomorGardu.value : this.nomorGardu,
      tier: data.tier.present ? data.tier.value : this.tier,
      snapshotJson: data.snapshotJson.present
          ? data.snapshotJson.value
          : this.snapshotJson,
      status: data.status.present ? data.status.value : this.status,
    );
  }

  @override
  String toString() {
    return (StringBuffer('InsGarduRealisasi(')
          ..write('localId: $localId, ')
          ..write('localHeaderId: $localHeaderId, ')
          ..write('kodePekerjaanGardu: $kodePekerjaanGardu, ')
          ..write('nomorGardu: $nomorGardu, ')
          ..write('tier: $tier, ')
          ..write('snapshotJson: $snapshotJson, ')
          ..write('status: $status')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(localId, localHeaderId, kodePekerjaanGardu,
      nomorGardu, tier, snapshotJson, status);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is InsGarduRealisasi &&
          other.localId == this.localId &&
          other.localHeaderId == this.localHeaderId &&
          other.kodePekerjaanGardu == this.kodePekerjaanGardu &&
          other.nomorGardu == this.nomorGardu &&
          other.tier == this.tier &&
          other.snapshotJson == this.snapshotJson &&
          other.status == this.status);
}

class InsGarduRealisasisCompanion extends UpdateCompanion<InsGarduRealisasi> {
  final Value<String> localId;
  final Value<String> localHeaderId;
  final Value<String> kodePekerjaanGardu;
  final Value<String> nomorGardu;
  final Value<String> tier;
  final Value<String> snapshotJson;
  final Value<String> status;
  final Value<int> rowid;
  const InsGarduRealisasisCompanion({
    this.localId = const Value.absent(),
    this.localHeaderId = const Value.absent(),
    this.kodePekerjaanGardu = const Value.absent(),
    this.nomorGardu = const Value.absent(),
    this.tier = const Value.absent(),
    this.snapshotJson = const Value.absent(),
    this.status = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  InsGarduRealisasisCompanion.insert({
    required String localId,
    required String localHeaderId,
    this.kodePekerjaanGardu = const Value.absent(),
    required String nomorGardu,
    this.tier = const Value.absent(),
    required String snapshotJson,
    this.status = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : localId = Value(localId),
        localHeaderId = Value(localHeaderId),
        nomorGardu = Value(nomorGardu),
        snapshotJson = Value(snapshotJson);
  static Insertable<InsGarduRealisasi> custom({
    Expression<String>? localId,
    Expression<String>? localHeaderId,
    Expression<String>? kodePekerjaanGardu,
    Expression<String>? nomorGardu,
    Expression<String>? tier,
    Expression<String>? snapshotJson,
    Expression<String>? status,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localId != null) 'local_id': localId,
      if (localHeaderId != null) 'local_header_id': localHeaderId,
      if (kodePekerjaanGardu != null)
        'kode_pekerjaan_gardu': kodePekerjaanGardu,
      if (nomorGardu != null) 'nomor_gardu': nomorGardu,
      if (tier != null) 'tier': tier,
      if (snapshotJson != null) 'snapshot_json': snapshotJson,
      if (status != null) 'status': status,
      if (rowid != null) 'rowid': rowid,
    });
  }

  InsGarduRealisasisCompanion copyWith(
      {Value<String>? localId,
      Value<String>? localHeaderId,
      Value<String>? kodePekerjaanGardu,
      Value<String>? nomorGardu,
      Value<String>? tier,
      Value<String>? snapshotJson,
      Value<String>? status,
      Value<int>? rowid}) {
    return InsGarduRealisasisCompanion(
      localId: localId ?? this.localId,
      localHeaderId: localHeaderId ?? this.localHeaderId,
      kodePekerjaanGardu: kodePekerjaanGardu ?? this.kodePekerjaanGardu,
      nomorGardu: nomorGardu ?? this.nomorGardu,
      tier: tier ?? this.tier,
      snapshotJson: snapshotJson ?? this.snapshotJson,
      status: status ?? this.status,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localId.present) {
      map['local_id'] = Variable<String>(localId.value);
    }
    if (localHeaderId.present) {
      map['local_header_id'] = Variable<String>(localHeaderId.value);
    }
    if (kodePekerjaanGardu.present) {
      map['kode_pekerjaan_gardu'] = Variable<String>(kodePekerjaanGardu.value);
    }
    if (nomorGardu.present) {
      map['nomor_gardu'] = Variable<String>(nomorGardu.value);
    }
    if (tier.present) {
      map['tier'] = Variable<String>(tier.value);
    }
    if (snapshotJson.present) {
      map['snapshot_json'] = Variable<String>(snapshotJson.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('InsGarduRealisasisCompanion(')
          ..write('localId: $localId, ')
          ..write('localHeaderId: $localHeaderId, ')
          ..write('kodePekerjaanGardu: $kodePekerjaanGardu, ')
          ..write('nomorGardu: $nomorGardu, ')
          ..write('tier: $tier, ')
          ..write('snapshotJson: $snapshotJson, ')
          ..write('status: $status, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $InsGarduTemuansTable extends InsGarduTemuans
    with TableInfo<$InsGarduTemuansTable, InsGarduTemuan> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $InsGarduTemuansTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localIdMeta =
      const VerificationMeta('localId');
  @override
  late final GeneratedColumn<String> localId = GeneratedColumn<String>(
      'local_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _localRealisasiIdMeta =
      const VerificationMeta('localRealisasiId');
  @override
  late final GeneratedColumn<String> localRealisasiId = GeneratedColumn<String>(
      'local_realisasi_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _kodeTemuanMeta =
      const VerificationMeta('kodeTemuan');
  @override
  late final GeneratedColumn<String> kodeTemuan = GeneratedColumn<String>(
      'kode_temuan', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _tierMeta = const VerificationMeta('tier');
  @override
  late final GeneratedColumn<String> tier = GeneratedColumn<String>(
      'tier', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _temuanMeta = const VerificationMeta('temuan');
  @override
  late final GeneratedColumn<String> temuan = GeneratedColumn<String>(
      'temuan', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _deskripsiMeta =
      const VerificationMeta('deskripsi');
  @override
  late final GeneratedColumn<String> deskripsi = GeneratedColumn<String>(
      'deskripsi', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _fotoTemuanPathMeta =
      const VerificationMeta('fotoTemuanPath');
  @override
  late final GeneratedColumn<String> fotoTemuanPath = GeneratedColumn<String>(
      'foto_temuan_path', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _fotoGarduPathMeta =
      const VerificationMeta('fotoGarduPath');
  @override
  late final GeneratedColumn<String> fotoGarduPath = GeneratedColumn<String>(
      'foto_gardu_path', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant(''));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('draft'));
  @override
  List<GeneratedColumn> get $columns => [
        localId,
        localRealisasiId,
        kodeTemuan,
        tier,
        temuan,
        deskripsi,
        fotoTemuanPath,
        fotoGarduPath,
        status
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'ins_gardu_temuan';
  @override
  VerificationContext validateIntegrity(Insertable<InsGarduTemuan> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_id')) {
      context.handle(_localIdMeta,
          localId.isAcceptableOrUnknown(data['local_id']!, _localIdMeta));
    } else if (isInserting) {
      context.missing(_localIdMeta);
    }
    if (data.containsKey('local_realisasi_id')) {
      context.handle(
          _localRealisasiIdMeta,
          localRealisasiId.isAcceptableOrUnknown(
              data['local_realisasi_id']!, _localRealisasiIdMeta));
    } else if (isInserting) {
      context.missing(_localRealisasiIdMeta);
    }
    if (data.containsKey('kode_temuan')) {
      context.handle(
          _kodeTemuanMeta,
          kodeTemuan.isAcceptableOrUnknown(
              data['kode_temuan']!, _kodeTemuanMeta));
    }
    if (data.containsKey('tier')) {
      context.handle(
          _tierMeta, tier.isAcceptableOrUnknown(data['tier']!, _tierMeta));
    } else if (isInserting) {
      context.missing(_tierMeta);
    }
    if (data.containsKey('temuan')) {
      context.handle(_temuanMeta,
          temuan.isAcceptableOrUnknown(data['temuan']!, _temuanMeta));
    } else if (isInserting) {
      context.missing(_temuanMeta);
    }
    if (data.containsKey('deskripsi')) {
      context.handle(_deskripsiMeta,
          deskripsi.isAcceptableOrUnknown(data['deskripsi']!, _deskripsiMeta));
    }
    if (data.containsKey('foto_temuan_path')) {
      context.handle(
          _fotoTemuanPathMeta,
          fotoTemuanPath.isAcceptableOrUnknown(
              data['foto_temuan_path']!, _fotoTemuanPathMeta));
    }
    if (data.containsKey('foto_gardu_path')) {
      context.handle(
          _fotoGarduPathMeta,
          fotoGarduPath.isAcceptableOrUnknown(
              data['foto_gardu_path']!, _fotoGarduPathMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localId};
  @override
  InsGarduTemuan map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return InsGarduTemuan(
      localId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_id'])!,
      localRealisasiId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}local_realisasi_id'])!,
      kodeTemuan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}kode_temuan'])!,
      tier: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tier'])!,
      temuan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}temuan'])!,
      deskripsi: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}deskripsi'])!,
      fotoTemuanPath: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}foto_temuan_path'])!,
      fotoGarduPath: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}foto_gardu_path'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
    );
  }

  @override
  $InsGarduTemuansTable createAlias(String alias) {
    return $InsGarduTemuansTable(attachedDatabase, alias);
  }
}

class InsGarduTemuan extends DataClass implements Insertable<InsGarduTemuan> {
  final String localId;
  final String localRealisasiId;
  final String kodeTemuan;
  final String tier;
  final String temuan;
  final String deskripsi;
  final String fotoTemuanPath;
  final String fotoGarduPath;
  final String status;
  const InsGarduTemuan(
      {required this.localId,
      required this.localRealisasiId,
      required this.kodeTemuan,
      required this.tier,
      required this.temuan,
      required this.deskripsi,
      required this.fotoTemuanPath,
      required this.fotoGarduPath,
      required this.status});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_id'] = Variable<String>(localId);
    map['local_realisasi_id'] = Variable<String>(localRealisasiId);
    map['kode_temuan'] = Variable<String>(kodeTemuan);
    map['tier'] = Variable<String>(tier);
    map['temuan'] = Variable<String>(temuan);
    map['deskripsi'] = Variable<String>(deskripsi);
    map['foto_temuan_path'] = Variable<String>(fotoTemuanPath);
    map['foto_gardu_path'] = Variable<String>(fotoGarduPath);
    map['status'] = Variable<String>(status);
    return map;
  }

  InsGarduTemuansCompanion toCompanion(bool nullToAbsent) {
    return InsGarduTemuansCompanion(
      localId: Value(localId),
      localRealisasiId: Value(localRealisasiId),
      kodeTemuan: Value(kodeTemuan),
      tier: Value(tier),
      temuan: Value(temuan),
      deskripsi: Value(deskripsi),
      fotoTemuanPath: Value(fotoTemuanPath),
      fotoGarduPath: Value(fotoGarduPath),
      status: Value(status),
    );
  }

  factory InsGarduTemuan.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return InsGarduTemuan(
      localId: serializer.fromJson<String>(json['localId']),
      localRealisasiId: serializer.fromJson<String>(json['localRealisasiId']),
      kodeTemuan: serializer.fromJson<String>(json['kodeTemuan']),
      tier: serializer.fromJson<String>(json['tier']),
      temuan: serializer.fromJson<String>(json['temuan']),
      deskripsi: serializer.fromJson<String>(json['deskripsi']),
      fotoTemuanPath: serializer.fromJson<String>(json['fotoTemuanPath']),
      fotoGarduPath: serializer.fromJson<String>(json['fotoGarduPath']),
      status: serializer.fromJson<String>(json['status']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localId': serializer.toJson<String>(localId),
      'localRealisasiId': serializer.toJson<String>(localRealisasiId),
      'kodeTemuan': serializer.toJson<String>(kodeTemuan),
      'tier': serializer.toJson<String>(tier),
      'temuan': serializer.toJson<String>(temuan),
      'deskripsi': serializer.toJson<String>(deskripsi),
      'fotoTemuanPath': serializer.toJson<String>(fotoTemuanPath),
      'fotoGarduPath': serializer.toJson<String>(fotoGarduPath),
      'status': serializer.toJson<String>(status),
    };
  }

  InsGarduTemuan copyWith(
          {String? localId,
          String? localRealisasiId,
          String? kodeTemuan,
          String? tier,
          String? temuan,
          String? deskripsi,
          String? fotoTemuanPath,
          String? fotoGarduPath,
          String? status}) =>
      InsGarduTemuan(
        localId: localId ?? this.localId,
        localRealisasiId: localRealisasiId ?? this.localRealisasiId,
        kodeTemuan: kodeTemuan ?? this.kodeTemuan,
        tier: tier ?? this.tier,
        temuan: temuan ?? this.temuan,
        deskripsi: deskripsi ?? this.deskripsi,
        fotoTemuanPath: fotoTemuanPath ?? this.fotoTemuanPath,
        fotoGarduPath: fotoGarduPath ?? this.fotoGarduPath,
        status: status ?? this.status,
      );
  InsGarduTemuan copyWithCompanion(InsGarduTemuansCompanion data) {
    return InsGarduTemuan(
      localId: data.localId.present ? data.localId.value : this.localId,
      localRealisasiId: data.localRealisasiId.present
          ? data.localRealisasiId.value
          : this.localRealisasiId,
      kodeTemuan:
          data.kodeTemuan.present ? data.kodeTemuan.value : this.kodeTemuan,
      tier: data.tier.present ? data.tier.value : this.tier,
      temuan: data.temuan.present ? data.temuan.value : this.temuan,
      deskripsi: data.deskripsi.present ? data.deskripsi.value : this.deskripsi,
      fotoTemuanPath: data.fotoTemuanPath.present
          ? data.fotoTemuanPath.value
          : this.fotoTemuanPath,
      fotoGarduPath: data.fotoGarduPath.present
          ? data.fotoGarduPath.value
          : this.fotoGarduPath,
      status: data.status.present ? data.status.value : this.status,
    );
  }

  @override
  String toString() {
    return (StringBuffer('InsGarduTemuan(')
          ..write('localId: $localId, ')
          ..write('localRealisasiId: $localRealisasiId, ')
          ..write('kodeTemuan: $kodeTemuan, ')
          ..write('tier: $tier, ')
          ..write('temuan: $temuan, ')
          ..write('deskripsi: $deskripsi, ')
          ..write('fotoTemuanPath: $fotoTemuanPath, ')
          ..write('fotoGarduPath: $fotoGarduPath, ')
          ..write('status: $status')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(localId, localRealisasiId, kodeTemuan, tier,
      temuan, deskripsi, fotoTemuanPath, fotoGarduPath, status);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is InsGarduTemuan &&
          other.localId == this.localId &&
          other.localRealisasiId == this.localRealisasiId &&
          other.kodeTemuan == this.kodeTemuan &&
          other.tier == this.tier &&
          other.temuan == this.temuan &&
          other.deskripsi == this.deskripsi &&
          other.fotoTemuanPath == this.fotoTemuanPath &&
          other.fotoGarduPath == this.fotoGarduPath &&
          other.status == this.status);
}

class InsGarduTemuansCompanion extends UpdateCompanion<InsGarduTemuan> {
  final Value<String> localId;
  final Value<String> localRealisasiId;
  final Value<String> kodeTemuan;
  final Value<String> tier;
  final Value<String> temuan;
  final Value<String> deskripsi;
  final Value<String> fotoTemuanPath;
  final Value<String> fotoGarduPath;
  final Value<String> status;
  final Value<int> rowid;
  const InsGarduTemuansCompanion({
    this.localId = const Value.absent(),
    this.localRealisasiId = const Value.absent(),
    this.kodeTemuan = const Value.absent(),
    this.tier = const Value.absent(),
    this.temuan = const Value.absent(),
    this.deskripsi = const Value.absent(),
    this.fotoTemuanPath = const Value.absent(),
    this.fotoGarduPath = const Value.absent(),
    this.status = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  InsGarduTemuansCompanion.insert({
    required String localId,
    required String localRealisasiId,
    this.kodeTemuan = const Value.absent(),
    required String tier,
    required String temuan,
    this.deskripsi = const Value.absent(),
    this.fotoTemuanPath = const Value.absent(),
    this.fotoGarduPath = const Value.absent(),
    this.status = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : localId = Value(localId),
        localRealisasiId = Value(localRealisasiId),
        tier = Value(tier),
        temuan = Value(temuan);
  static Insertable<InsGarduTemuan> custom({
    Expression<String>? localId,
    Expression<String>? localRealisasiId,
    Expression<String>? kodeTemuan,
    Expression<String>? tier,
    Expression<String>? temuan,
    Expression<String>? deskripsi,
    Expression<String>? fotoTemuanPath,
    Expression<String>? fotoGarduPath,
    Expression<String>? status,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localId != null) 'local_id': localId,
      if (localRealisasiId != null) 'local_realisasi_id': localRealisasiId,
      if (kodeTemuan != null) 'kode_temuan': kodeTemuan,
      if (tier != null) 'tier': tier,
      if (temuan != null) 'temuan': temuan,
      if (deskripsi != null) 'deskripsi': deskripsi,
      if (fotoTemuanPath != null) 'foto_temuan_path': fotoTemuanPath,
      if (fotoGarduPath != null) 'foto_gardu_path': fotoGarduPath,
      if (status != null) 'status': status,
      if (rowid != null) 'rowid': rowid,
    });
  }

  InsGarduTemuansCompanion copyWith(
      {Value<String>? localId,
      Value<String>? localRealisasiId,
      Value<String>? kodeTemuan,
      Value<String>? tier,
      Value<String>? temuan,
      Value<String>? deskripsi,
      Value<String>? fotoTemuanPath,
      Value<String>? fotoGarduPath,
      Value<String>? status,
      Value<int>? rowid}) {
    return InsGarduTemuansCompanion(
      localId: localId ?? this.localId,
      localRealisasiId: localRealisasiId ?? this.localRealisasiId,
      kodeTemuan: kodeTemuan ?? this.kodeTemuan,
      tier: tier ?? this.tier,
      temuan: temuan ?? this.temuan,
      deskripsi: deskripsi ?? this.deskripsi,
      fotoTemuanPath: fotoTemuanPath ?? this.fotoTemuanPath,
      fotoGarduPath: fotoGarduPath ?? this.fotoGarduPath,
      status: status ?? this.status,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localId.present) {
      map['local_id'] = Variable<String>(localId.value);
    }
    if (localRealisasiId.present) {
      map['local_realisasi_id'] = Variable<String>(localRealisasiId.value);
    }
    if (kodeTemuan.present) {
      map['kode_temuan'] = Variable<String>(kodeTemuan.value);
    }
    if (tier.present) {
      map['tier'] = Variable<String>(tier.value);
    }
    if (temuan.present) {
      map['temuan'] = Variable<String>(temuan.value);
    }
    if (deskripsi.present) {
      map['deskripsi'] = Variable<String>(deskripsi.value);
    }
    if (fotoTemuanPath.present) {
      map['foto_temuan_path'] = Variable<String>(fotoTemuanPath.value);
    }
    if (fotoGarduPath.present) {
      map['foto_gardu_path'] = Variable<String>(fotoGarduPath.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('InsGarduTemuansCompanion(')
          ..write('localId: $localId, ')
          ..write('localRealisasiId: $localRealisasiId, ')
          ..write('kodeTemuan: $kodeTemuan, ')
          ..write('tier: $tier, ')
          ..write('temuan: $temuan, ')
          ..write('deskripsi: $deskripsi, ')
          ..write('fotoTemuanPath: $fotoTemuanPath, ')
          ..write('fotoGarduPath: $fotoGarduPath, ')
          ..write('status: $status, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ListTemuansTable extends ListTemuans
    with TableInfo<$ListTemuansTable, ListTemuan> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ListTemuansTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _noMeta = const VerificationMeta('no');
  @override
  late final GeneratedColumn<int> no = GeneratedColumn<int>(
      'no', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _tierMeta = const VerificationMeta('tier');
  @override
  late final GeneratedColumn<String> tier = GeneratedColumn<String>(
      'tier', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _objekInspeksiMeta =
      const VerificationMeta('objekInspeksi');
  @override
  late final GeneratedColumn<String> objekInspeksi = GeneratedColumn<String>(
      'objek_inspeksi', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _temuanMeta = const VerificationMeta('temuan');
  @override
  late final GeneratedColumn<String> temuan = GeneratedColumn<String>(
      'temuan', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [no, tier, objekInspeksi, temuan];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'list_temuan';
  @override
  VerificationContext validateIntegrity(Insertable<ListTemuan> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('no')) {
      context.handle(_noMeta, no.isAcceptableOrUnknown(data['no']!, _noMeta));
    }
    if (data.containsKey('tier')) {
      context.handle(
          _tierMeta, tier.isAcceptableOrUnknown(data['tier']!, _tierMeta));
    } else if (isInserting) {
      context.missing(_tierMeta);
    }
    if (data.containsKey('objek_inspeksi')) {
      context.handle(
          _objekInspeksiMeta,
          objekInspeksi.isAcceptableOrUnknown(
              data['objek_inspeksi']!, _objekInspeksiMeta));
    } else if (isInserting) {
      context.missing(_objekInspeksiMeta);
    }
    if (data.containsKey('temuan')) {
      context.handle(_temuanMeta,
          temuan.isAcceptableOrUnknown(data['temuan']!, _temuanMeta));
    } else if (isInserting) {
      context.missing(_temuanMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {tier, objekInspeksi, temuan};
  @override
  ListTemuan map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ListTemuan(
      no: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}no']),
      tier: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tier'])!,
      objekInspeksi: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}objek_inspeksi'])!,
      temuan: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}temuan'])!,
    );
  }

  @override
  $ListTemuansTable createAlias(String alias) {
    return $ListTemuansTable(attachedDatabase, alias);
  }
}

class ListTemuan extends DataClass implements Insertable<ListTemuan> {
  final int? no;
  final String tier;
  final String objekInspeksi;
  final String temuan;
  const ListTemuan(
      {this.no,
      required this.tier,
      required this.objekInspeksi,
      required this.temuan});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (!nullToAbsent || no != null) {
      map['no'] = Variable<int>(no);
    }
    map['tier'] = Variable<String>(tier);
    map['objek_inspeksi'] = Variable<String>(objekInspeksi);
    map['temuan'] = Variable<String>(temuan);
    return map;
  }

  ListTemuansCompanion toCompanion(bool nullToAbsent) {
    return ListTemuansCompanion(
      no: no == null && nullToAbsent ? const Value.absent() : Value(no),
      tier: Value(tier),
      objekInspeksi: Value(objekInspeksi),
      temuan: Value(temuan),
    );
  }

  factory ListTemuan.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ListTemuan(
      no: serializer.fromJson<int?>(json['no']),
      tier: serializer.fromJson<String>(json['tier']),
      objekInspeksi: serializer.fromJson<String>(json['objekInspeksi']),
      temuan: serializer.fromJson<String>(json['temuan']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'no': serializer.toJson<int?>(no),
      'tier': serializer.toJson<String>(tier),
      'objekInspeksi': serializer.toJson<String>(objekInspeksi),
      'temuan': serializer.toJson<String>(temuan),
    };
  }

  ListTemuan copyWith(
          {Value<int?> no = const Value.absent(),
          String? tier,
          String? objekInspeksi,
          String? temuan}) =>
      ListTemuan(
        no: no.present ? no.value : this.no,
        tier: tier ?? this.tier,
        objekInspeksi: objekInspeksi ?? this.objekInspeksi,
        temuan: temuan ?? this.temuan,
      );
  ListTemuan copyWithCompanion(ListTemuansCompanion data) {
    return ListTemuan(
      no: data.no.present ? data.no.value : this.no,
      tier: data.tier.present ? data.tier.value : this.tier,
      objekInspeksi: data.objekInspeksi.present
          ? data.objekInspeksi.value
          : this.objekInspeksi,
      temuan: data.temuan.present ? data.temuan.value : this.temuan,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ListTemuan(')
          ..write('no: $no, ')
          ..write('tier: $tier, ')
          ..write('objekInspeksi: $objekInspeksi, ')
          ..write('temuan: $temuan')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(no, tier, objekInspeksi, temuan);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ListTemuan &&
          other.no == this.no &&
          other.tier == this.tier &&
          other.objekInspeksi == this.objekInspeksi &&
          other.temuan == this.temuan);
}

class ListTemuansCompanion extends UpdateCompanion<ListTemuan> {
  final Value<int?> no;
  final Value<String> tier;
  final Value<String> objekInspeksi;
  final Value<String> temuan;
  final Value<int> rowid;
  const ListTemuansCompanion({
    this.no = const Value.absent(),
    this.tier = const Value.absent(),
    this.objekInspeksi = const Value.absent(),
    this.temuan = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ListTemuansCompanion.insert({
    this.no = const Value.absent(),
    required String tier,
    required String objekInspeksi,
    required String temuan,
    this.rowid = const Value.absent(),
  })  : tier = Value(tier),
        objekInspeksi = Value(objekInspeksi),
        temuan = Value(temuan);
  static Insertable<ListTemuan> custom({
    Expression<int>? no,
    Expression<String>? tier,
    Expression<String>? objekInspeksi,
    Expression<String>? temuan,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (no != null) 'no': no,
      if (tier != null) 'tier': tier,
      if (objekInspeksi != null) 'objek_inspeksi': objekInspeksi,
      if (temuan != null) 'temuan': temuan,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ListTemuansCompanion copyWith(
      {Value<int?>? no,
      Value<String>? tier,
      Value<String>? objekInspeksi,
      Value<String>? temuan,
      Value<int>? rowid}) {
    return ListTemuansCompanion(
      no: no ?? this.no,
      tier: tier ?? this.tier,
      objekInspeksi: objekInspeksi ?? this.objekInspeksi,
      temuan: temuan ?? this.temuan,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (no.present) {
      map['no'] = Variable<int>(no.value);
    }
    if (tier.present) {
      map['tier'] = Variable<String>(tier.value);
    }
    if (objekInspeksi.present) {
      map['objek_inspeksi'] = Variable<String>(objekInspeksi.value);
    }
    if (temuan.present) {
      map['temuan'] = Variable<String>(temuan.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ListTemuansCompanion(')
          ..write('no: $no, ')
          ..write('tier: $tier, ')
          ..write('objekInspeksi: $objekInspeksi, ')
          ..write('temuan: $temuan, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $GlobalHeadersTable globalHeaders = $GlobalHeadersTable(this);
  late final $MasterPenyulangsTable masterPenyulangs =
      $MasterPenyulangsTable(this);
  late final $LaporanHariansTable laporanHarians = $LaporanHariansTable(this);
  late final $SyncInfosTable syncInfos = $SyncInfosTable(this);
  late final $P0LokalsTable p0Lokals = $P0LokalsTable(this);
  late final $P0OutboxesTable p0Outboxes = $P0OutboxesTable(this);
  late final $MasterGardusTable masterGardus = $MasterGardusTable(this);
  late final $GarduOutboxesTable garduOutboxes = $GarduOutboxesTable(this);
  late final $InsGarduHeadersTable insGarduHeaders =
      $InsGarduHeadersTable(this);
  late final $InsGarduRealisasisTable insGarduRealisasis =
      $InsGarduRealisasisTable(this);
  late final $InsGarduTemuansTable insGarduTemuans =
      $InsGarduTemuansTable(this);
  late final $ListTemuansTable listTemuans = $ListTemuansTable(this);
  late final Index idxGlobalHeaderTanggal = Index('idx_global_header_tanggal',
      'CREATE INDEX idx_global_header_tanggal ON global_header (tanggal)');
  late final Index idxGlobalHeaderTim = Index('idx_global_header_tim',
      'CREATE INDEX idx_global_header_tim ON global_header (tim)');
  late final Index idxGlobalHeaderSubTim = Index('idx_global_header_sub_tim',
      'CREATE INDEX idx_global_header_sub_tim ON global_header (sub_tim)');
  late final Index idxMasterPenyulangNama = Index('idx_master_penyulang_nama',
      'CREATE INDEX idx_master_penyulang_nama ON master_penyulang (nama_penyulang)');
  late final Index idxMasterGarduUlp = Index('idx_master_gardu_ulp',
      'CREATE INDEX idx_master_gardu_ulp ON master_gardu (ulp)');
  late final Index idxMasterGarduNomor = Index('idx_master_gardu_nomor',
      'CREATE INDEX idx_master_gardu_nomor ON master_gardu (gardu)');
  late final MasterDao masterDao = MasterDao(this as AppDatabase);
  late final LaporanDao laporanDao = LaporanDao(this as AppDatabase);
  late final SyncDao syncDao = SyncDao(this as AppDatabase);
  late final HeaderDao headerDao = HeaderDao(this as AppDatabase);
  late final P0Dao p0Dao = P0Dao(this as AppDatabase);
  late final MasterGarduDao masterGarduDao =
      MasterGarduDao(this as AppDatabase);
  late final InspeksiGarduDao inspeksiGarduDao =
      InspeksiGarduDao(this as AppDatabase);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        globalHeaders,
        masterPenyulangs,
        laporanHarians,
        syncInfos,
        p0Lokals,
        p0Outboxes,
        masterGardus,
        garduOutboxes,
        insGarduHeaders,
        insGarduRealisasis,
        insGarduTemuans,
        listTemuans,
        idxGlobalHeaderTanggal,
        idxGlobalHeaderTim,
        idxGlobalHeaderSubTim,
        idxMasterPenyulangNama,
        idxMasterGarduUlp,
        idxMasterGarduNomor
      ];
}

typedef $$GlobalHeadersTableCreateCompanionBuilder = GlobalHeadersCompanion
    Function({
  Value<int?> no,
  required String kodeHeader,
  Value<String> ulp,
  Value<String> hari,
  Value<String> tanggal,
  Value<String> tim,
  Value<String> subTim,
  Value<String> koordinatAwal,
  Value<String> koordinatAkhir,
  Value<String> kmAwal,
  Value<String> kmAkhir,
  Value<String> kendala,
  Value<String> waText,
  Value<String> timestamp,
  Value<String> inputBy,
  Value<String> timestampUpdate,
  Value<String> statusTextWa,
  Value<int> rowid,
});
typedef $$GlobalHeadersTableUpdateCompanionBuilder = GlobalHeadersCompanion
    Function({
  Value<int?> no,
  Value<String> kodeHeader,
  Value<String> ulp,
  Value<String> hari,
  Value<String> tanggal,
  Value<String> tim,
  Value<String> subTim,
  Value<String> koordinatAwal,
  Value<String> koordinatAkhir,
  Value<String> kmAwal,
  Value<String> kmAkhir,
  Value<String> kendala,
  Value<String> waText,
  Value<String> timestamp,
  Value<String> inputBy,
  Value<String> timestampUpdate,
  Value<String> statusTextWa,
  Value<int> rowid,
});

class $$GlobalHeadersTableFilterComposer
    extends Composer<_$AppDatabase, $GlobalHeadersTable> {
  $$GlobalHeadersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get hari => $composableBuilder(
      column: $table.hari, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tim => $composableBuilder(
      column: $table.tim, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get subTim => $composableBuilder(
      column: $table.subTim, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kmAwal => $composableBuilder(
      column: $table.kmAwal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kmAkhir => $composableBuilder(
      column: $table.kmAkhir, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kendala => $composableBuilder(
      column: $table.kendala, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get waText => $composableBuilder(
      column: $table.waText, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get inputBy => $composableBuilder(
      column: $table.inputBy, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get timestampUpdate => $composableBuilder(
      column: $table.timestampUpdate,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get statusTextWa => $composableBuilder(
      column: $table.statusTextWa, builder: (column) => ColumnFilters(column));
}

class $$GlobalHeadersTableOrderingComposer
    extends Composer<_$AppDatabase, $GlobalHeadersTable> {
  $$GlobalHeadersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get hari => $composableBuilder(
      column: $table.hari, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tim => $composableBuilder(
      column: $table.tim, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get subTim => $composableBuilder(
      column: $table.subTim, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kmAwal => $composableBuilder(
      column: $table.kmAwal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kmAkhir => $composableBuilder(
      column: $table.kmAkhir, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kendala => $composableBuilder(
      column: $table.kendala, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get waText => $composableBuilder(
      column: $table.waText, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get inputBy => $composableBuilder(
      column: $table.inputBy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get timestampUpdate => $composableBuilder(
      column: $table.timestampUpdate,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get statusTextWa => $composableBuilder(
      column: $table.statusTextWa,
      builder: (column) => ColumnOrderings(column));
}

class $$GlobalHeadersTableAnnotationComposer
    extends Composer<_$AppDatabase, $GlobalHeadersTable> {
  $$GlobalHeadersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get no =>
      $composableBuilder(column: $table.no, builder: (column) => column);

  GeneratedColumn<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => column);

  GeneratedColumn<String> get ulp =>
      $composableBuilder(column: $table.ulp, builder: (column) => column);

  GeneratedColumn<String> get hari =>
      $composableBuilder(column: $table.hari, builder: (column) => column);

  GeneratedColumn<String> get tanggal =>
      $composableBuilder(column: $table.tanggal, builder: (column) => column);

  GeneratedColumn<String> get tim =>
      $composableBuilder(column: $table.tim, builder: (column) => column);

  GeneratedColumn<String> get subTim =>
      $composableBuilder(column: $table.subTim, builder: (column) => column);

  GeneratedColumn<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal, builder: (column) => column);

  GeneratedColumn<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir, builder: (column) => column);

  GeneratedColumn<String> get kmAwal =>
      $composableBuilder(column: $table.kmAwal, builder: (column) => column);

  GeneratedColumn<String> get kmAkhir =>
      $composableBuilder(column: $table.kmAkhir, builder: (column) => column);

  GeneratedColumn<String> get kendala =>
      $composableBuilder(column: $table.kendala, builder: (column) => column);

  GeneratedColumn<String> get waText =>
      $composableBuilder(column: $table.waText, builder: (column) => column);

  GeneratedColumn<String> get timestamp =>
      $composableBuilder(column: $table.timestamp, builder: (column) => column);

  GeneratedColumn<String> get inputBy =>
      $composableBuilder(column: $table.inputBy, builder: (column) => column);

  GeneratedColumn<String> get timestampUpdate => $composableBuilder(
      column: $table.timestampUpdate, builder: (column) => column);

  GeneratedColumn<String> get statusTextWa => $composableBuilder(
      column: $table.statusTextWa, builder: (column) => column);
}

class $$GlobalHeadersTableTableManager extends RootTableManager<
    _$AppDatabase,
    $GlobalHeadersTable,
    GlobalHeader,
    $$GlobalHeadersTableFilterComposer,
    $$GlobalHeadersTableOrderingComposer,
    $$GlobalHeadersTableAnnotationComposer,
    $$GlobalHeadersTableCreateCompanionBuilder,
    $$GlobalHeadersTableUpdateCompanionBuilder,
    (
      GlobalHeader,
      BaseReferences<_$AppDatabase, $GlobalHeadersTable, GlobalHeader>
    ),
    GlobalHeader,
    PrefetchHooks Function()> {
  $$GlobalHeadersTableTableManager(_$AppDatabase db, $GlobalHeadersTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$GlobalHeadersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$GlobalHeadersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$GlobalHeadersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            Value<String> kodeHeader = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> hari = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> tim = const Value.absent(),
            Value<String> subTim = const Value.absent(),
            Value<String> koordinatAwal = const Value.absent(),
            Value<String> koordinatAkhir = const Value.absent(),
            Value<String> kmAwal = const Value.absent(),
            Value<String> kmAkhir = const Value.absent(),
            Value<String> kendala = const Value.absent(),
            Value<String> waText = const Value.absent(),
            Value<String> timestamp = const Value.absent(),
            Value<String> inputBy = const Value.absent(),
            Value<String> timestampUpdate = const Value.absent(),
            Value<String> statusTextWa = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              GlobalHeadersCompanion(
            no: no,
            kodeHeader: kodeHeader,
            ulp: ulp,
            hari: hari,
            tanggal: tanggal,
            tim: tim,
            subTim: subTim,
            koordinatAwal: koordinatAwal,
            koordinatAkhir: koordinatAkhir,
            kmAwal: kmAwal,
            kmAkhir: kmAkhir,
            kendala: kendala,
            waText: waText,
            timestamp: timestamp,
            inputBy: inputBy,
            timestampUpdate: timestampUpdate,
            statusTextWa: statusTextWa,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            required String kodeHeader,
            Value<String> ulp = const Value.absent(),
            Value<String> hari = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> tim = const Value.absent(),
            Value<String> subTim = const Value.absent(),
            Value<String> koordinatAwal = const Value.absent(),
            Value<String> koordinatAkhir = const Value.absent(),
            Value<String> kmAwal = const Value.absent(),
            Value<String> kmAkhir = const Value.absent(),
            Value<String> kendala = const Value.absent(),
            Value<String> waText = const Value.absent(),
            Value<String> timestamp = const Value.absent(),
            Value<String> inputBy = const Value.absent(),
            Value<String> timestampUpdate = const Value.absent(),
            Value<String> statusTextWa = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              GlobalHeadersCompanion.insert(
            no: no,
            kodeHeader: kodeHeader,
            ulp: ulp,
            hari: hari,
            tanggal: tanggal,
            tim: tim,
            subTim: subTim,
            koordinatAwal: koordinatAwal,
            koordinatAkhir: koordinatAkhir,
            kmAwal: kmAwal,
            kmAkhir: kmAkhir,
            kendala: kendala,
            waText: waText,
            timestamp: timestamp,
            inputBy: inputBy,
            timestampUpdate: timestampUpdate,
            statusTextWa: statusTextWa,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$GlobalHeadersTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $GlobalHeadersTable,
    GlobalHeader,
    $$GlobalHeadersTableFilterComposer,
    $$GlobalHeadersTableOrderingComposer,
    $$GlobalHeadersTableAnnotationComposer,
    $$GlobalHeadersTableCreateCompanionBuilder,
    $$GlobalHeadersTableUpdateCompanionBuilder,
    (
      GlobalHeader,
      BaseReferences<_$AppDatabase, $GlobalHeadersTable, GlobalHeader>
    ),
    GlobalHeader,
    PrefetchHooks Function()>;
typedef $$MasterPenyulangsTableCreateCompanionBuilder
    = MasterPenyulangsCompanion Function({
  Value<int> id,
  Value<int?> no,
  Value<String> ulp,
  Value<String> namaPenyulang,
  Value<String> namaSwitching,
  Value<String> section,
});
typedef $$MasterPenyulangsTableUpdateCompanionBuilder
    = MasterPenyulangsCompanion Function({
  Value<int> id,
  Value<int?> no,
  Value<String> ulp,
  Value<String> namaPenyulang,
  Value<String> namaSwitching,
  Value<String> section,
});

class $$MasterPenyulangsTableFilterComposer
    extends Composer<_$AppDatabase, $MasterPenyulangsTable> {
  $$MasterPenyulangsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get namaPenyulang => $composableBuilder(
      column: $table.namaPenyulang, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get namaSwitching => $composableBuilder(
      column: $table.namaSwitching, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get section => $composableBuilder(
      column: $table.section, builder: (column) => ColumnFilters(column));
}

class $$MasterPenyulangsTableOrderingComposer
    extends Composer<_$AppDatabase, $MasterPenyulangsTable> {
  $$MasterPenyulangsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get namaPenyulang => $composableBuilder(
      column: $table.namaPenyulang,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get namaSwitching => $composableBuilder(
      column: $table.namaSwitching,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get section => $composableBuilder(
      column: $table.section, builder: (column) => ColumnOrderings(column));
}

class $$MasterPenyulangsTableAnnotationComposer
    extends Composer<_$AppDatabase, $MasterPenyulangsTable> {
  $$MasterPenyulangsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get no =>
      $composableBuilder(column: $table.no, builder: (column) => column);

  GeneratedColumn<String> get ulp =>
      $composableBuilder(column: $table.ulp, builder: (column) => column);

  GeneratedColumn<String> get namaPenyulang => $composableBuilder(
      column: $table.namaPenyulang, builder: (column) => column);

  GeneratedColumn<String> get namaSwitching => $composableBuilder(
      column: $table.namaSwitching, builder: (column) => column);

  GeneratedColumn<String> get section =>
      $composableBuilder(column: $table.section, builder: (column) => column);
}

class $$MasterPenyulangsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $MasterPenyulangsTable,
    MasterPenyulang,
    $$MasterPenyulangsTableFilterComposer,
    $$MasterPenyulangsTableOrderingComposer,
    $$MasterPenyulangsTableAnnotationComposer,
    $$MasterPenyulangsTableCreateCompanionBuilder,
    $$MasterPenyulangsTableUpdateCompanionBuilder,
    (
      MasterPenyulang,
      BaseReferences<_$AppDatabase, $MasterPenyulangsTable, MasterPenyulang>
    ),
    MasterPenyulang,
    PrefetchHooks Function()> {
  $$MasterPenyulangsTableTableManager(
      _$AppDatabase db, $MasterPenyulangsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MasterPenyulangsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MasterPenyulangsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MasterPenyulangsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int?> no = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> namaPenyulang = const Value.absent(),
            Value<String> namaSwitching = const Value.absent(),
            Value<String> section = const Value.absent(),
          }) =>
              MasterPenyulangsCompanion(
            id: id,
            no: no,
            ulp: ulp,
            namaPenyulang: namaPenyulang,
            namaSwitching: namaSwitching,
            section: section,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<int?> no = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> namaPenyulang = const Value.absent(),
            Value<String> namaSwitching = const Value.absent(),
            Value<String> section = const Value.absent(),
          }) =>
              MasterPenyulangsCompanion.insert(
            id: id,
            no: no,
            ulp: ulp,
            namaPenyulang: namaPenyulang,
            namaSwitching: namaSwitching,
            section: section,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$MasterPenyulangsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $MasterPenyulangsTable,
    MasterPenyulang,
    $$MasterPenyulangsTableFilterComposer,
    $$MasterPenyulangsTableOrderingComposer,
    $$MasterPenyulangsTableAnnotationComposer,
    $$MasterPenyulangsTableCreateCompanionBuilder,
    $$MasterPenyulangsTableUpdateCompanionBuilder,
    (
      MasterPenyulang,
      BaseReferences<_$AppDatabase, $MasterPenyulangsTable, MasterPenyulang>
    ),
    MasterPenyulang,
    PrefetchHooks Function()>;
typedef $$LaporanHariansTableCreateCompanionBuilder = LaporanHariansCompanion
    Function({
  Value<int?> no,
  required String tanggal,
  Value<String> penyulang,
  Value<String> panjangKms,
  Value<String> temuan,
  Value<String> eksekusi,
  Value<String> laporanUp3,
  Value<String> laporanUiw,
  Value<int> rowid,
});
typedef $$LaporanHariansTableUpdateCompanionBuilder = LaporanHariansCompanion
    Function({
  Value<int?> no,
  Value<String> tanggal,
  Value<String> penyulang,
  Value<String> panjangKms,
  Value<String> temuan,
  Value<String> eksekusi,
  Value<String> laporanUp3,
  Value<String> laporanUiw,
  Value<int> rowid,
});

class $$LaporanHariansTableFilterComposer
    extends Composer<_$AppDatabase, $LaporanHariansTable> {
  $$LaporanHariansTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get penyulang => $composableBuilder(
      column: $table.penyulang, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get panjangKms => $composableBuilder(
      column: $table.panjangKms, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get temuan => $composableBuilder(
      column: $table.temuan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get eksekusi => $composableBuilder(
      column: $table.eksekusi, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get laporanUp3 => $composableBuilder(
      column: $table.laporanUp3, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get laporanUiw => $composableBuilder(
      column: $table.laporanUiw, builder: (column) => ColumnFilters(column));
}

class $$LaporanHariansTableOrderingComposer
    extends Composer<_$AppDatabase, $LaporanHariansTable> {
  $$LaporanHariansTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get penyulang => $composableBuilder(
      column: $table.penyulang, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get panjangKms => $composableBuilder(
      column: $table.panjangKms, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get temuan => $composableBuilder(
      column: $table.temuan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get eksekusi => $composableBuilder(
      column: $table.eksekusi, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get laporanUp3 => $composableBuilder(
      column: $table.laporanUp3, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get laporanUiw => $composableBuilder(
      column: $table.laporanUiw, builder: (column) => ColumnOrderings(column));
}

class $$LaporanHariansTableAnnotationComposer
    extends Composer<_$AppDatabase, $LaporanHariansTable> {
  $$LaporanHariansTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get no =>
      $composableBuilder(column: $table.no, builder: (column) => column);

  GeneratedColumn<String> get tanggal =>
      $composableBuilder(column: $table.tanggal, builder: (column) => column);

  GeneratedColumn<String> get penyulang =>
      $composableBuilder(column: $table.penyulang, builder: (column) => column);

  GeneratedColumn<String> get panjangKms => $composableBuilder(
      column: $table.panjangKms, builder: (column) => column);

  GeneratedColumn<String> get temuan =>
      $composableBuilder(column: $table.temuan, builder: (column) => column);

  GeneratedColumn<String> get eksekusi =>
      $composableBuilder(column: $table.eksekusi, builder: (column) => column);

  GeneratedColumn<String> get laporanUp3 => $composableBuilder(
      column: $table.laporanUp3, builder: (column) => column);

  GeneratedColumn<String> get laporanUiw => $composableBuilder(
      column: $table.laporanUiw, builder: (column) => column);
}

class $$LaporanHariansTableTableManager extends RootTableManager<
    _$AppDatabase,
    $LaporanHariansTable,
    LaporanHarian,
    $$LaporanHariansTableFilterComposer,
    $$LaporanHariansTableOrderingComposer,
    $$LaporanHariansTableAnnotationComposer,
    $$LaporanHariansTableCreateCompanionBuilder,
    $$LaporanHariansTableUpdateCompanionBuilder,
    (
      LaporanHarian,
      BaseReferences<_$AppDatabase, $LaporanHariansTable, LaporanHarian>
    ),
    LaporanHarian,
    PrefetchHooks Function()> {
  $$LaporanHariansTableTableManager(
      _$AppDatabase db, $LaporanHariansTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LaporanHariansTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LaporanHariansTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LaporanHariansTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> penyulang = const Value.absent(),
            Value<String> panjangKms = const Value.absent(),
            Value<String> temuan = const Value.absent(),
            Value<String> eksekusi = const Value.absent(),
            Value<String> laporanUp3 = const Value.absent(),
            Value<String> laporanUiw = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              LaporanHariansCompanion(
            no: no,
            tanggal: tanggal,
            penyulang: penyulang,
            panjangKms: panjangKms,
            temuan: temuan,
            eksekusi: eksekusi,
            laporanUp3: laporanUp3,
            laporanUiw: laporanUiw,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            required String tanggal,
            Value<String> penyulang = const Value.absent(),
            Value<String> panjangKms = const Value.absent(),
            Value<String> temuan = const Value.absent(),
            Value<String> eksekusi = const Value.absent(),
            Value<String> laporanUp3 = const Value.absent(),
            Value<String> laporanUiw = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              LaporanHariansCompanion.insert(
            no: no,
            tanggal: tanggal,
            penyulang: penyulang,
            panjangKms: panjangKms,
            temuan: temuan,
            eksekusi: eksekusi,
            laporanUp3: laporanUp3,
            laporanUiw: laporanUiw,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$LaporanHariansTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $LaporanHariansTable,
    LaporanHarian,
    $$LaporanHariansTableFilterComposer,
    $$LaporanHariansTableOrderingComposer,
    $$LaporanHariansTableAnnotationComposer,
    $$LaporanHariansTableCreateCompanionBuilder,
    $$LaporanHariansTableUpdateCompanionBuilder,
    (
      LaporanHarian,
      BaseReferences<_$AppDatabase, $LaporanHariansTable, LaporanHarian>
    ),
    LaporanHarian,
    PrefetchHooks Function()>;
typedef $$SyncInfosTableCreateCompanionBuilder = SyncInfosCompanion Function({
  required String key,
  Value<String> lastSyncAt,
  Value<int> jumlahData,
  Value<String> keterangan,
  Value<int> rowid,
});
typedef $$SyncInfosTableUpdateCompanionBuilder = SyncInfosCompanion Function({
  Value<String> key,
  Value<String> lastSyncAt,
  Value<int> jumlahData,
  Value<String> keterangan,
  Value<int> rowid,
});

class $$SyncInfosTableFilterComposer
    extends Composer<_$AppDatabase, $SyncInfosTable> {
  $$SyncInfosTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastSyncAt => $composableBuilder(
      column: $table.lastSyncAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get jumlahData => $composableBuilder(
      column: $table.jumlahData, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get keterangan => $composableBuilder(
      column: $table.keterangan, builder: (column) => ColumnFilters(column));
}

class $$SyncInfosTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncInfosTable> {
  $$SyncInfosTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastSyncAt => $composableBuilder(
      column: $table.lastSyncAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get jumlahData => $composableBuilder(
      column: $table.jumlahData, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get keterangan => $composableBuilder(
      column: $table.keterangan, builder: (column) => ColumnOrderings(column));
}

class $$SyncInfosTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncInfosTable> {
  $$SyncInfosTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get lastSyncAt => $composableBuilder(
      column: $table.lastSyncAt, builder: (column) => column);

  GeneratedColumn<int> get jumlahData => $composableBuilder(
      column: $table.jumlahData, builder: (column) => column);

  GeneratedColumn<String> get keterangan => $composableBuilder(
      column: $table.keterangan, builder: (column) => column);
}

class $$SyncInfosTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SyncInfosTable,
    SyncInfo,
    $$SyncInfosTableFilterComposer,
    $$SyncInfosTableOrderingComposer,
    $$SyncInfosTableAnnotationComposer,
    $$SyncInfosTableCreateCompanionBuilder,
    $$SyncInfosTableUpdateCompanionBuilder,
    (SyncInfo, BaseReferences<_$AppDatabase, $SyncInfosTable, SyncInfo>),
    SyncInfo,
    PrefetchHooks Function()> {
  $$SyncInfosTableTableManager(_$AppDatabase db, $SyncInfosTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncInfosTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncInfosTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncInfosTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> key = const Value.absent(),
            Value<String> lastSyncAt = const Value.absent(),
            Value<int> jumlahData = const Value.absent(),
            Value<String> keterangan = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              SyncInfosCompanion(
            key: key,
            lastSyncAt: lastSyncAt,
            jumlahData: jumlahData,
            keterangan: keterangan,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String key,
            Value<String> lastSyncAt = const Value.absent(),
            Value<int> jumlahData = const Value.absent(),
            Value<String> keterangan = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              SyncInfosCompanion.insert(
            key: key,
            lastSyncAt: lastSyncAt,
            jumlahData: jumlahData,
            keterangan: keterangan,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SyncInfosTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SyncInfosTable,
    SyncInfo,
    $$SyncInfosTableFilterComposer,
    $$SyncInfosTableOrderingComposer,
    $$SyncInfosTableAnnotationComposer,
    $$SyncInfosTableCreateCompanionBuilder,
    $$SyncInfosTableUpdateCompanionBuilder,
    (SyncInfo, BaseReferences<_$AppDatabase, $SyncInfosTable, SyncInfo>),
    SyncInfo,
    PrefetchHooks Function()>;
typedef $$P0LokalsTableCreateCompanionBuilder = P0LokalsCompanion Function({
  required String kodeP0,
  Value<String> ulp,
  Value<String> tanggal,
  Value<String> statusServer,
  Value<String> dataJson,
  Value<String> diambilPada,
  Value<int> rowid,
});
typedef $$P0LokalsTableUpdateCompanionBuilder = P0LokalsCompanion Function({
  Value<String> kodeP0,
  Value<String> ulp,
  Value<String> tanggal,
  Value<String> statusServer,
  Value<String> dataJson,
  Value<String> diambilPada,
  Value<int> rowid,
});

class $$P0LokalsTableFilterComposer
    extends Composer<_$AppDatabase, $P0LokalsTable> {
  $$P0LokalsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get kodeP0 => $composableBuilder(
      column: $table.kodeP0, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get statusServer => $composableBuilder(
      column: $table.statusServer, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get dataJson => $composableBuilder(
      column: $table.dataJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get diambilPada => $composableBuilder(
      column: $table.diambilPada, builder: (column) => ColumnFilters(column));
}

class $$P0LokalsTableOrderingComposer
    extends Composer<_$AppDatabase, $P0LokalsTable> {
  $$P0LokalsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get kodeP0 => $composableBuilder(
      column: $table.kodeP0, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get statusServer => $composableBuilder(
      column: $table.statusServer,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get dataJson => $composableBuilder(
      column: $table.dataJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get diambilPada => $composableBuilder(
      column: $table.diambilPada, builder: (column) => ColumnOrderings(column));
}

class $$P0LokalsTableAnnotationComposer
    extends Composer<_$AppDatabase, $P0LokalsTable> {
  $$P0LokalsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get kodeP0 =>
      $composableBuilder(column: $table.kodeP0, builder: (column) => column);

  GeneratedColumn<String> get ulp =>
      $composableBuilder(column: $table.ulp, builder: (column) => column);

  GeneratedColumn<String> get tanggal =>
      $composableBuilder(column: $table.tanggal, builder: (column) => column);

  GeneratedColumn<String> get statusServer => $composableBuilder(
      column: $table.statusServer, builder: (column) => column);

  GeneratedColumn<String> get dataJson =>
      $composableBuilder(column: $table.dataJson, builder: (column) => column);

  GeneratedColumn<String> get diambilPada => $composableBuilder(
      column: $table.diambilPada, builder: (column) => column);
}

class $$P0LokalsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $P0LokalsTable,
    P0Lokal,
    $$P0LokalsTableFilterComposer,
    $$P0LokalsTableOrderingComposer,
    $$P0LokalsTableAnnotationComposer,
    $$P0LokalsTableCreateCompanionBuilder,
    $$P0LokalsTableUpdateCompanionBuilder,
    (P0Lokal, BaseReferences<_$AppDatabase, $P0LokalsTable, P0Lokal>),
    P0Lokal,
    PrefetchHooks Function()> {
  $$P0LokalsTableTableManager(_$AppDatabase db, $P0LokalsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$P0LokalsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$P0LokalsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$P0LokalsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> kodeP0 = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> statusServer = const Value.absent(),
            Value<String> dataJson = const Value.absent(),
            Value<String> diambilPada = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              P0LokalsCompanion(
            kodeP0: kodeP0,
            ulp: ulp,
            tanggal: tanggal,
            statusServer: statusServer,
            dataJson: dataJson,
            diambilPada: diambilPada,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String kodeP0,
            Value<String> ulp = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> statusServer = const Value.absent(),
            Value<String> dataJson = const Value.absent(),
            Value<String> diambilPada = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              P0LokalsCompanion.insert(
            kodeP0: kodeP0,
            ulp: ulp,
            tanggal: tanggal,
            statusServer: statusServer,
            dataJson: dataJson,
            diambilPada: diambilPada,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$P0LokalsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $P0LokalsTable,
    P0Lokal,
    $$P0LokalsTableFilterComposer,
    $$P0LokalsTableOrderingComposer,
    $$P0LokalsTableAnnotationComposer,
    $$P0LokalsTableCreateCompanionBuilder,
    $$P0LokalsTableUpdateCompanionBuilder,
    (P0Lokal, BaseReferences<_$AppDatabase, $P0LokalsTable, P0Lokal>),
    P0Lokal,
    PrefetchHooks Function()>;
typedef $$P0OutboxesTableCreateCompanionBuilder = P0OutboxesCompanion Function({
  required String kodeP0,
  required String keputusan,
  Value<String> alasan,
  Value<String> username,
  Value<String> tanggal,
  Value<String> dibuatPada,
  Value<String> status,
  Value<int> percobaan,
  Value<String> pesanGagal,
  Value<int> rowid,
});
typedef $$P0OutboxesTableUpdateCompanionBuilder = P0OutboxesCompanion Function({
  Value<String> kodeP0,
  Value<String> keputusan,
  Value<String> alasan,
  Value<String> username,
  Value<String> tanggal,
  Value<String> dibuatPada,
  Value<String> status,
  Value<int> percobaan,
  Value<String> pesanGagal,
  Value<int> rowid,
});

class $$P0OutboxesTableFilterComposer
    extends Composer<_$AppDatabase, $P0OutboxesTable> {
  $$P0OutboxesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get kodeP0 => $composableBuilder(
      column: $table.kodeP0, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get keputusan => $composableBuilder(
      column: $table.keputusan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get alasan => $composableBuilder(
      column: $table.alasan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get username => $composableBuilder(
      column: $table.username, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get dibuatPada => $composableBuilder(
      column: $table.dibuatPada, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get percobaan => $composableBuilder(
      column: $table.percobaan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => ColumnFilters(column));
}

class $$P0OutboxesTableOrderingComposer
    extends Composer<_$AppDatabase, $P0OutboxesTable> {
  $$P0OutboxesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get kodeP0 => $composableBuilder(
      column: $table.kodeP0, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get keputusan => $composableBuilder(
      column: $table.keputusan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get alasan => $composableBuilder(
      column: $table.alasan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get username => $composableBuilder(
      column: $table.username, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get dibuatPada => $composableBuilder(
      column: $table.dibuatPada, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get percobaan => $composableBuilder(
      column: $table.percobaan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => ColumnOrderings(column));
}

class $$P0OutboxesTableAnnotationComposer
    extends Composer<_$AppDatabase, $P0OutboxesTable> {
  $$P0OutboxesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get kodeP0 =>
      $composableBuilder(column: $table.kodeP0, builder: (column) => column);

  GeneratedColumn<String> get keputusan =>
      $composableBuilder(column: $table.keputusan, builder: (column) => column);

  GeneratedColumn<String> get alasan =>
      $composableBuilder(column: $table.alasan, builder: (column) => column);

  GeneratedColumn<String> get username =>
      $composableBuilder(column: $table.username, builder: (column) => column);

  GeneratedColumn<String> get tanggal =>
      $composableBuilder(column: $table.tanggal, builder: (column) => column);

  GeneratedColumn<String> get dibuatPada => $composableBuilder(
      column: $table.dibuatPada, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get percobaan =>
      $composableBuilder(column: $table.percobaan, builder: (column) => column);

  GeneratedColumn<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => column);
}

class $$P0OutboxesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $P0OutboxesTable,
    P0Outbox,
    $$P0OutboxesTableFilterComposer,
    $$P0OutboxesTableOrderingComposer,
    $$P0OutboxesTableAnnotationComposer,
    $$P0OutboxesTableCreateCompanionBuilder,
    $$P0OutboxesTableUpdateCompanionBuilder,
    (P0Outbox, BaseReferences<_$AppDatabase, $P0OutboxesTable, P0Outbox>),
    P0Outbox,
    PrefetchHooks Function()> {
  $$P0OutboxesTableTableManager(_$AppDatabase db, $P0OutboxesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$P0OutboxesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$P0OutboxesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$P0OutboxesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> kodeP0 = const Value.absent(),
            Value<String> keputusan = const Value.absent(),
            Value<String> alasan = const Value.absent(),
            Value<String> username = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> dibuatPada = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> percobaan = const Value.absent(),
            Value<String> pesanGagal = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              P0OutboxesCompanion(
            kodeP0: kodeP0,
            keputusan: keputusan,
            alasan: alasan,
            username: username,
            tanggal: tanggal,
            dibuatPada: dibuatPada,
            status: status,
            percobaan: percobaan,
            pesanGagal: pesanGagal,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String kodeP0,
            required String keputusan,
            Value<String> alasan = const Value.absent(),
            Value<String> username = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> dibuatPada = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> percobaan = const Value.absent(),
            Value<String> pesanGagal = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              P0OutboxesCompanion.insert(
            kodeP0: kodeP0,
            keputusan: keputusan,
            alasan: alasan,
            username: username,
            tanggal: tanggal,
            dibuatPada: dibuatPada,
            status: status,
            percobaan: percobaan,
            pesanGagal: pesanGagal,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$P0OutboxesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $P0OutboxesTable,
    P0Outbox,
    $$P0OutboxesTableFilterComposer,
    $$P0OutboxesTableOrderingComposer,
    $$P0OutboxesTableAnnotationComposer,
    $$P0OutboxesTableCreateCompanionBuilder,
    $$P0OutboxesTableUpdateCompanionBuilder,
    (P0Outbox, BaseReferences<_$AppDatabase, $P0OutboxesTable, P0Outbox>),
    P0Outbox,
    PrefetchHooks Function()>;
typedef $$MasterGardusTableCreateCompanionBuilder = MasterGardusCompanion
    Function({
  Value<String> ulp,
  required String gardu,
  Value<String> alamat,
  Value<String> penyulang,
  Value<String> section,
  Value<String> jenisGardu,
  Value<String> merk,
  Value<String> kapasitasKva,
  Value<String> noSeri,
  Value<String> tahunTrafo,
  Value<String> typeSeal,
  Value<String> beratTrafo,
  Value<String> volumeMinyak,
  Value<String> merkPhbTr,
  Value<String> nomorSeriPhbTr,
  Value<String> tahunPhbTr,
  Value<String> jamUkurWbp,
  Value<String> tanggalPengukuran,
  Value<String> kepemilikan,
  Value<String> wbpRs,
  Value<String> wbpSt,
  Value<String> wbpTr,
  Value<String> wbpRn,
  Value<String> wbpSn,
  Value<String> wbpTn,
  Value<String> wbpR,
  Value<String> wbpS,
  Value<String> wbpT,
  Value<String> wbpN,
  Value<String> lwbpRs,
  Value<String> lwbpSt,
  Value<String> lwbpTr,
  Value<String> lwbpRn,
  Value<String> lwbpSn,
  Value<String> lwbpTn,
  Value<String> lwbpR,
  Value<String> lwbpS,
  Value<String> lwbpT,
  Value<String> lwbpN,
  Value<String> arusMaxPerFasa,
  Value<String> pembebananKva,
  Value<String> pembebananKw,
  Value<String> persentaseBeban,
  Value<String> kategoriBeban,
  Value<int> rowid,
});
typedef $$MasterGardusTableUpdateCompanionBuilder = MasterGardusCompanion
    Function({
  Value<String> ulp,
  Value<String> gardu,
  Value<String> alamat,
  Value<String> penyulang,
  Value<String> section,
  Value<String> jenisGardu,
  Value<String> merk,
  Value<String> kapasitasKva,
  Value<String> noSeri,
  Value<String> tahunTrafo,
  Value<String> typeSeal,
  Value<String> beratTrafo,
  Value<String> volumeMinyak,
  Value<String> merkPhbTr,
  Value<String> nomorSeriPhbTr,
  Value<String> tahunPhbTr,
  Value<String> jamUkurWbp,
  Value<String> tanggalPengukuran,
  Value<String> kepemilikan,
  Value<String> wbpRs,
  Value<String> wbpSt,
  Value<String> wbpTr,
  Value<String> wbpRn,
  Value<String> wbpSn,
  Value<String> wbpTn,
  Value<String> wbpR,
  Value<String> wbpS,
  Value<String> wbpT,
  Value<String> wbpN,
  Value<String> lwbpRs,
  Value<String> lwbpSt,
  Value<String> lwbpTr,
  Value<String> lwbpRn,
  Value<String> lwbpSn,
  Value<String> lwbpTn,
  Value<String> lwbpR,
  Value<String> lwbpS,
  Value<String> lwbpT,
  Value<String> lwbpN,
  Value<String> arusMaxPerFasa,
  Value<String> pembebananKva,
  Value<String> pembebananKw,
  Value<String> persentaseBeban,
  Value<String> kategoriBeban,
  Value<int> rowid,
});

class $$MasterGardusTableFilterComposer
    extends Composer<_$AppDatabase, $MasterGardusTable> {
  $$MasterGardusTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get gardu => $composableBuilder(
      column: $table.gardu, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get alamat => $composableBuilder(
      column: $table.alamat, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get penyulang => $composableBuilder(
      column: $table.penyulang, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get section => $composableBuilder(
      column: $table.section, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get jenisGardu => $composableBuilder(
      column: $table.jenisGardu, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get merk => $composableBuilder(
      column: $table.merk, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kapasitasKva => $composableBuilder(
      column: $table.kapasitasKva, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get noSeri => $composableBuilder(
      column: $table.noSeri, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tahunTrafo => $composableBuilder(
      column: $table.tahunTrafo, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get typeSeal => $composableBuilder(
      column: $table.typeSeal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get beratTrafo => $composableBuilder(
      column: $table.beratTrafo, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get volumeMinyak => $composableBuilder(
      column: $table.volumeMinyak, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get merkPhbTr => $composableBuilder(
      column: $table.merkPhbTr, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get nomorSeriPhbTr => $composableBuilder(
      column: $table.nomorSeriPhbTr,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tahunPhbTr => $composableBuilder(
      column: $table.tahunPhbTr, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get jamUkurWbp => $composableBuilder(
      column: $table.jamUkurWbp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tanggalPengukuran => $composableBuilder(
      column: $table.tanggalPengukuran,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kepemilikan => $composableBuilder(
      column: $table.kepemilikan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpRs => $composableBuilder(
      column: $table.wbpRs, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpSt => $composableBuilder(
      column: $table.wbpSt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpTr => $composableBuilder(
      column: $table.wbpTr, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpRn => $composableBuilder(
      column: $table.wbpRn, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpSn => $composableBuilder(
      column: $table.wbpSn, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpTn => $composableBuilder(
      column: $table.wbpTn, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpR => $composableBuilder(
      column: $table.wbpR, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpS => $composableBuilder(
      column: $table.wbpS, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpT => $composableBuilder(
      column: $table.wbpT, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get wbpN => $composableBuilder(
      column: $table.wbpN, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpRs => $composableBuilder(
      column: $table.lwbpRs, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpSt => $composableBuilder(
      column: $table.lwbpSt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpTr => $composableBuilder(
      column: $table.lwbpTr, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpRn => $composableBuilder(
      column: $table.lwbpRn, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpSn => $composableBuilder(
      column: $table.lwbpSn, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpTn => $composableBuilder(
      column: $table.lwbpTn, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpR => $composableBuilder(
      column: $table.lwbpR, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpS => $composableBuilder(
      column: $table.lwbpS, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpT => $composableBuilder(
      column: $table.lwbpT, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lwbpN => $composableBuilder(
      column: $table.lwbpN, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get arusMaxPerFasa => $composableBuilder(
      column: $table.arusMaxPerFasa,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get pembebananKva => $composableBuilder(
      column: $table.pembebananKva, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get pembebananKw => $composableBuilder(
      column: $table.pembebananKw, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get persentaseBeban => $composableBuilder(
      column: $table.persentaseBeban,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kategoriBeban => $composableBuilder(
      column: $table.kategoriBeban, builder: (column) => ColumnFilters(column));
}

class $$MasterGardusTableOrderingComposer
    extends Composer<_$AppDatabase, $MasterGardusTable> {
  $$MasterGardusTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get gardu => $composableBuilder(
      column: $table.gardu, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get alamat => $composableBuilder(
      column: $table.alamat, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get penyulang => $composableBuilder(
      column: $table.penyulang, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get section => $composableBuilder(
      column: $table.section, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get jenisGardu => $composableBuilder(
      column: $table.jenisGardu, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get merk => $composableBuilder(
      column: $table.merk, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kapasitasKva => $composableBuilder(
      column: $table.kapasitasKva,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get noSeri => $composableBuilder(
      column: $table.noSeri, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tahunTrafo => $composableBuilder(
      column: $table.tahunTrafo, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get typeSeal => $composableBuilder(
      column: $table.typeSeal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get beratTrafo => $composableBuilder(
      column: $table.beratTrafo, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get volumeMinyak => $composableBuilder(
      column: $table.volumeMinyak,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get merkPhbTr => $composableBuilder(
      column: $table.merkPhbTr, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get nomorSeriPhbTr => $composableBuilder(
      column: $table.nomorSeriPhbTr,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tahunPhbTr => $composableBuilder(
      column: $table.tahunPhbTr, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get jamUkurWbp => $composableBuilder(
      column: $table.jamUkurWbp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tanggalPengukuran => $composableBuilder(
      column: $table.tanggalPengukuran,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kepemilikan => $composableBuilder(
      column: $table.kepemilikan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpRs => $composableBuilder(
      column: $table.wbpRs, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpSt => $composableBuilder(
      column: $table.wbpSt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpTr => $composableBuilder(
      column: $table.wbpTr, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpRn => $composableBuilder(
      column: $table.wbpRn, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpSn => $composableBuilder(
      column: $table.wbpSn, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpTn => $composableBuilder(
      column: $table.wbpTn, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpR => $composableBuilder(
      column: $table.wbpR, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpS => $composableBuilder(
      column: $table.wbpS, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpT => $composableBuilder(
      column: $table.wbpT, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get wbpN => $composableBuilder(
      column: $table.wbpN, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpRs => $composableBuilder(
      column: $table.lwbpRs, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpSt => $composableBuilder(
      column: $table.lwbpSt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpTr => $composableBuilder(
      column: $table.lwbpTr, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpRn => $composableBuilder(
      column: $table.lwbpRn, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpSn => $composableBuilder(
      column: $table.lwbpSn, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpTn => $composableBuilder(
      column: $table.lwbpTn, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpR => $composableBuilder(
      column: $table.lwbpR, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpS => $composableBuilder(
      column: $table.lwbpS, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpT => $composableBuilder(
      column: $table.lwbpT, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lwbpN => $composableBuilder(
      column: $table.lwbpN, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get arusMaxPerFasa => $composableBuilder(
      column: $table.arusMaxPerFasa,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get pembebananKva => $composableBuilder(
      column: $table.pembebananKva,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get pembebananKw => $composableBuilder(
      column: $table.pembebananKw,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get persentaseBeban => $composableBuilder(
      column: $table.persentaseBeban,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kategoriBeban => $composableBuilder(
      column: $table.kategoriBeban,
      builder: (column) => ColumnOrderings(column));
}

class $$MasterGardusTableAnnotationComposer
    extends Composer<_$AppDatabase, $MasterGardusTable> {
  $$MasterGardusTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get ulp =>
      $composableBuilder(column: $table.ulp, builder: (column) => column);

  GeneratedColumn<String> get gardu =>
      $composableBuilder(column: $table.gardu, builder: (column) => column);

  GeneratedColumn<String> get alamat =>
      $composableBuilder(column: $table.alamat, builder: (column) => column);

  GeneratedColumn<String> get penyulang =>
      $composableBuilder(column: $table.penyulang, builder: (column) => column);

  GeneratedColumn<String> get section =>
      $composableBuilder(column: $table.section, builder: (column) => column);

  GeneratedColumn<String> get jenisGardu => $composableBuilder(
      column: $table.jenisGardu, builder: (column) => column);

  GeneratedColumn<String> get merk =>
      $composableBuilder(column: $table.merk, builder: (column) => column);

  GeneratedColumn<String> get kapasitasKva => $composableBuilder(
      column: $table.kapasitasKva, builder: (column) => column);

  GeneratedColumn<String> get noSeri =>
      $composableBuilder(column: $table.noSeri, builder: (column) => column);

  GeneratedColumn<String> get tahunTrafo => $composableBuilder(
      column: $table.tahunTrafo, builder: (column) => column);

  GeneratedColumn<String> get typeSeal =>
      $composableBuilder(column: $table.typeSeal, builder: (column) => column);

  GeneratedColumn<String> get beratTrafo => $composableBuilder(
      column: $table.beratTrafo, builder: (column) => column);

  GeneratedColumn<String> get volumeMinyak => $composableBuilder(
      column: $table.volumeMinyak, builder: (column) => column);

  GeneratedColumn<String> get merkPhbTr =>
      $composableBuilder(column: $table.merkPhbTr, builder: (column) => column);

  GeneratedColumn<String> get nomorSeriPhbTr => $composableBuilder(
      column: $table.nomorSeriPhbTr, builder: (column) => column);

  GeneratedColumn<String> get tahunPhbTr => $composableBuilder(
      column: $table.tahunPhbTr, builder: (column) => column);

  GeneratedColumn<String> get jamUkurWbp => $composableBuilder(
      column: $table.jamUkurWbp, builder: (column) => column);

  GeneratedColumn<String> get tanggalPengukuran => $composableBuilder(
      column: $table.tanggalPengukuran, builder: (column) => column);

  GeneratedColumn<String> get kepemilikan => $composableBuilder(
      column: $table.kepemilikan, builder: (column) => column);

  GeneratedColumn<String> get wbpRs =>
      $composableBuilder(column: $table.wbpRs, builder: (column) => column);

  GeneratedColumn<String> get wbpSt =>
      $composableBuilder(column: $table.wbpSt, builder: (column) => column);

  GeneratedColumn<String> get wbpTr =>
      $composableBuilder(column: $table.wbpTr, builder: (column) => column);

  GeneratedColumn<String> get wbpRn =>
      $composableBuilder(column: $table.wbpRn, builder: (column) => column);

  GeneratedColumn<String> get wbpSn =>
      $composableBuilder(column: $table.wbpSn, builder: (column) => column);

  GeneratedColumn<String> get wbpTn =>
      $composableBuilder(column: $table.wbpTn, builder: (column) => column);

  GeneratedColumn<String> get wbpR =>
      $composableBuilder(column: $table.wbpR, builder: (column) => column);

  GeneratedColumn<String> get wbpS =>
      $composableBuilder(column: $table.wbpS, builder: (column) => column);

  GeneratedColumn<String> get wbpT =>
      $composableBuilder(column: $table.wbpT, builder: (column) => column);

  GeneratedColumn<String> get wbpN =>
      $composableBuilder(column: $table.wbpN, builder: (column) => column);

  GeneratedColumn<String> get lwbpRs =>
      $composableBuilder(column: $table.lwbpRs, builder: (column) => column);

  GeneratedColumn<String> get lwbpSt =>
      $composableBuilder(column: $table.lwbpSt, builder: (column) => column);

  GeneratedColumn<String> get lwbpTr =>
      $composableBuilder(column: $table.lwbpTr, builder: (column) => column);

  GeneratedColumn<String> get lwbpRn =>
      $composableBuilder(column: $table.lwbpRn, builder: (column) => column);

  GeneratedColumn<String> get lwbpSn =>
      $composableBuilder(column: $table.lwbpSn, builder: (column) => column);

  GeneratedColumn<String> get lwbpTn =>
      $composableBuilder(column: $table.lwbpTn, builder: (column) => column);

  GeneratedColumn<String> get lwbpR =>
      $composableBuilder(column: $table.lwbpR, builder: (column) => column);

  GeneratedColumn<String> get lwbpS =>
      $composableBuilder(column: $table.lwbpS, builder: (column) => column);

  GeneratedColumn<String> get lwbpT =>
      $composableBuilder(column: $table.lwbpT, builder: (column) => column);

  GeneratedColumn<String> get lwbpN =>
      $composableBuilder(column: $table.lwbpN, builder: (column) => column);

  GeneratedColumn<String> get arusMaxPerFasa => $composableBuilder(
      column: $table.arusMaxPerFasa, builder: (column) => column);

  GeneratedColumn<String> get pembebananKva => $composableBuilder(
      column: $table.pembebananKva, builder: (column) => column);

  GeneratedColumn<String> get pembebananKw => $composableBuilder(
      column: $table.pembebananKw, builder: (column) => column);

  GeneratedColumn<String> get persentaseBeban => $composableBuilder(
      column: $table.persentaseBeban, builder: (column) => column);

  GeneratedColumn<String> get kategoriBeban => $composableBuilder(
      column: $table.kategoriBeban, builder: (column) => column);
}

class $$MasterGardusTableTableManager extends RootTableManager<
    _$AppDatabase,
    $MasterGardusTable,
    MasterGardusData,
    $$MasterGardusTableFilterComposer,
    $$MasterGardusTableOrderingComposer,
    $$MasterGardusTableAnnotationComposer,
    $$MasterGardusTableCreateCompanionBuilder,
    $$MasterGardusTableUpdateCompanionBuilder,
    (
      MasterGardusData,
      BaseReferences<_$AppDatabase, $MasterGardusTable, MasterGardusData>
    ),
    MasterGardusData,
    PrefetchHooks Function()> {
  $$MasterGardusTableTableManager(_$AppDatabase db, $MasterGardusTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MasterGardusTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MasterGardusTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MasterGardusTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> ulp = const Value.absent(),
            Value<String> gardu = const Value.absent(),
            Value<String> alamat = const Value.absent(),
            Value<String> penyulang = const Value.absent(),
            Value<String> section = const Value.absent(),
            Value<String> jenisGardu = const Value.absent(),
            Value<String> merk = const Value.absent(),
            Value<String> kapasitasKva = const Value.absent(),
            Value<String> noSeri = const Value.absent(),
            Value<String> tahunTrafo = const Value.absent(),
            Value<String> typeSeal = const Value.absent(),
            Value<String> beratTrafo = const Value.absent(),
            Value<String> volumeMinyak = const Value.absent(),
            Value<String> merkPhbTr = const Value.absent(),
            Value<String> nomorSeriPhbTr = const Value.absent(),
            Value<String> tahunPhbTr = const Value.absent(),
            Value<String> jamUkurWbp = const Value.absent(),
            Value<String> tanggalPengukuran = const Value.absent(),
            Value<String> kepemilikan = const Value.absent(),
            Value<String> wbpRs = const Value.absent(),
            Value<String> wbpSt = const Value.absent(),
            Value<String> wbpTr = const Value.absent(),
            Value<String> wbpRn = const Value.absent(),
            Value<String> wbpSn = const Value.absent(),
            Value<String> wbpTn = const Value.absent(),
            Value<String> wbpR = const Value.absent(),
            Value<String> wbpS = const Value.absent(),
            Value<String> wbpT = const Value.absent(),
            Value<String> wbpN = const Value.absent(),
            Value<String> lwbpRs = const Value.absent(),
            Value<String> lwbpSt = const Value.absent(),
            Value<String> lwbpTr = const Value.absent(),
            Value<String> lwbpRn = const Value.absent(),
            Value<String> lwbpSn = const Value.absent(),
            Value<String> lwbpTn = const Value.absent(),
            Value<String> lwbpR = const Value.absent(),
            Value<String> lwbpS = const Value.absent(),
            Value<String> lwbpT = const Value.absent(),
            Value<String> lwbpN = const Value.absent(),
            Value<String> arusMaxPerFasa = const Value.absent(),
            Value<String> pembebananKva = const Value.absent(),
            Value<String> pembebananKw = const Value.absent(),
            Value<String> persentaseBeban = const Value.absent(),
            Value<String> kategoriBeban = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              MasterGardusCompanion(
            ulp: ulp,
            gardu: gardu,
            alamat: alamat,
            penyulang: penyulang,
            section: section,
            jenisGardu: jenisGardu,
            merk: merk,
            kapasitasKva: kapasitasKva,
            noSeri: noSeri,
            tahunTrafo: tahunTrafo,
            typeSeal: typeSeal,
            beratTrafo: beratTrafo,
            volumeMinyak: volumeMinyak,
            merkPhbTr: merkPhbTr,
            nomorSeriPhbTr: nomorSeriPhbTr,
            tahunPhbTr: tahunPhbTr,
            jamUkurWbp: jamUkurWbp,
            tanggalPengukuran: tanggalPengukuran,
            kepemilikan: kepemilikan,
            wbpRs: wbpRs,
            wbpSt: wbpSt,
            wbpTr: wbpTr,
            wbpRn: wbpRn,
            wbpSn: wbpSn,
            wbpTn: wbpTn,
            wbpR: wbpR,
            wbpS: wbpS,
            wbpT: wbpT,
            wbpN: wbpN,
            lwbpRs: lwbpRs,
            lwbpSt: lwbpSt,
            lwbpTr: lwbpTr,
            lwbpRn: lwbpRn,
            lwbpSn: lwbpSn,
            lwbpTn: lwbpTn,
            lwbpR: lwbpR,
            lwbpS: lwbpS,
            lwbpT: lwbpT,
            lwbpN: lwbpN,
            arusMaxPerFasa: arusMaxPerFasa,
            pembebananKva: pembebananKva,
            pembebananKw: pembebananKw,
            persentaseBeban: persentaseBeban,
            kategoriBeban: kategoriBeban,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            Value<String> ulp = const Value.absent(),
            required String gardu,
            Value<String> alamat = const Value.absent(),
            Value<String> penyulang = const Value.absent(),
            Value<String> section = const Value.absent(),
            Value<String> jenisGardu = const Value.absent(),
            Value<String> merk = const Value.absent(),
            Value<String> kapasitasKva = const Value.absent(),
            Value<String> noSeri = const Value.absent(),
            Value<String> tahunTrafo = const Value.absent(),
            Value<String> typeSeal = const Value.absent(),
            Value<String> beratTrafo = const Value.absent(),
            Value<String> volumeMinyak = const Value.absent(),
            Value<String> merkPhbTr = const Value.absent(),
            Value<String> nomorSeriPhbTr = const Value.absent(),
            Value<String> tahunPhbTr = const Value.absent(),
            Value<String> jamUkurWbp = const Value.absent(),
            Value<String> tanggalPengukuran = const Value.absent(),
            Value<String> kepemilikan = const Value.absent(),
            Value<String> wbpRs = const Value.absent(),
            Value<String> wbpSt = const Value.absent(),
            Value<String> wbpTr = const Value.absent(),
            Value<String> wbpRn = const Value.absent(),
            Value<String> wbpSn = const Value.absent(),
            Value<String> wbpTn = const Value.absent(),
            Value<String> wbpR = const Value.absent(),
            Value<String> wbpS = const Value.absent(),
            Value<String> wbpT = const Value.absent(),
            Value<String> wbpN = const Value.absent(),
            Value<String> lwbpRs = const Value.absent(),
            Value<String> lwbpSt = const Value.absent(),
            Value<String> lwbpTr = const Value.absent(),
            Value<String> lwbpRn = const Value.absent(),
            Value<String> lwbpSn = const Value.absent(),
            Value<String> lwbpTn = const Value.absent(),
            Value<String> lwbpR = const Value.absent(),
            Value<String> lwbpS = const Value.absent(),
            Value<String> lwbpT = const Value.absent(),
            Value<String> lwbpN = const Value.absent(),
            Value<String> arusMaxPerFasa = const Value.absent(),
            Value<String> pembebananKva = const Value.absent(),
            Value<String> pembebananKw = const Value.absent(),
            Value<String> persentaseBeban = const Value.absent(),
            Value<String> kategoriBeban = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              MasterGardusCompanion.insert(
            ulp: ulp,
            gardu: gardu,
            alamat: alamat,
            penyulang: penyulang,
            section: section,
            jenisGardu: jenisGardu,
            merk: merk,
            kapasitasKva: kapasitasKva,
            noSeri: noSeri,
            tahunTrafo: tahunTrafo,
            typeSeal: typeSeal,
            beratTrafo: beratTrafo,
            volumeMinyak: volumeMinyak,
            merkPhbTr: merkPhbTr,
            nomorSeriPhbTr: nomorSeriPhbTr,
            tahunPhbTr: tahunPhbTr,
            jamUkurWbp: jamUkurWbp,
            tanggalPengukuran: tanggalPengukuran,
            kepemilikan: kepemilikan,
            wbpRs: wbpRs,
            wbpSt: wbpSt,
            wbpTr: wbpTr,
            wbpRn: wbpRn,
            wbpSn: wbpSn,
            wbpTn: wbpTn,
            wbpR: wbpR,
            wbpS: wbpS,
            wbpT: wbpT,
            wbpN: wbpN,
            lwbpRs: lwbpRs,
            lwbpSt: lwbpSt,
            lwbpTr: lwbpTr,
            lwbpRn: lwbpRn,
            lwbpSn: lwbpSn,
            lwbpTn: lwbpTn,
            lwbpR: lwbpR,
            lwbpS: lwbpS,
            lwbpT: lwbpT,
            lwbpN: lwbpN,
            arusMaxPerFasa: arusMaxPerFasa,
            pembebananKva: pembebananKva,
            pembebananKw: pembebananKw,
            persentaseBeban: persentaseBeban,
            kategoriBeban: kategoriBeban,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$MasterGardusTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $MasterGardusTable,
    MasterGardusData,
    $$MasterGardusTableFilterComposer,
    $$MasterGardusTableOrderingComposer,
    $$MasterGardusTableAnnotationComposer,
    $$MasterGardusTableCreateCompanionBuilder,
    $$MasterGardusTableUpdateCompanionBuilder,
    (
      MasterGardusData,
      BaseReferences<_$AppDatabase, $MasterGardusTable, MasterGardusData>
    ),
    MasterGardusData,
    PrefetchHooks Function()>;
typedef $$GarduOutboxesTableCreateCompanionBuilder = GarduOutboxesCompanion
    Function({
  required String gardu,
  Value<String> ulp,
  Value<String> perubahanJson,
  Value<String> diubahOleh,
  Value<String> diubahPada,
  Value<String> status,
  Value<int> percobaan,
  Value<String> pesanGagal,
  Value<int> rowid,
});
typedef $$GarduOutboxesTableUpdateCompanionBuilder = GarduOutboxesCompanion
    Function({
  Value<String> gardu,
  Value<String> ulp,
  Value<String> perubahanJson,
  Value<String> diubahOleh,
  Value<String> diubahPada,
  Value<String> status,
  Value<int> percobaan,
  Value<String> pesanGagal,
  Value<int> rowid,
});

class $$GarduOutboxesTableFilterComposer
    extends Composer<_$AppDatabase, $GarduOutboxesTable> {
  $$GarduOutboxesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get gardu => $composableBuilder(
      column: $table.gardu, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get perubahanJson => $composableBuilder(
      column: $table.perubahanJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get diubahOleh => $composableBuilder(
      column: $table.diubahOleh, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get diubahPada => $composableBuilder(
      column: $table.diubahPada, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get percobaan => $composableBuilder(
      column: $table.percobaan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => ColumnFilters(column));
}

class $$GarduOutboxesTableOrderingComposer
    extends Composer<_$AppDatabase, $GarduOutboxesTable> {
  $$GarduOutboxesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get gardu => $composableBuilder(
      column: $table.gardu, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get perubahanJson => $composableBuilder(
      column: $table.perubahanJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get diubahOleh => $composableBuilder(
      column: $table.diubahOleh, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get diubahPada => $composableBuilder(
      column: $table.diubahPada, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get percobaan => $composableBuilder(
      column: $table.percobaan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => ColumnOrderings(column));
}

class $$GarduOutboxesTableAnnotationComposer
    extends Composer<_$AppDatabase, $GarduOutboxesTable> {
  $$GarduOutboxesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get gardu =>
      $composableBuilder(column: $table.gardu, builder: (column) => column);

  GeneratedColumn<String> get ulp =>
      $composableBuilder(column: $table.ulp, builder: (column) => column);

  GeneratedColumn<String> get perubahanJson => $composableBuilder(
      column: $table.perubahanJson, builder: (column) => column);

  GeneratedColumn<String> get diubahOleh => $composableBuilder(
      column: $table.diubahOleh, builder: (column) => column);

  GeneratedColumn<String> get diubahPada => $composableBuilder(
      column: $table.diubahPada, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get percobaan =>
      $composableBuilder(column: $table.percobaan, builder: (column) => column);

  GeneratedColumn<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => column);
}

class $$GarduOutboxesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $GarduOutboxesTable,
    GarduOutbox,
    $$GarduOutboxesTableFilterComposer,
    $$GarduOutboxesTableOrderingComposer,
    $$GarduOutboxesTableAnnotationComposer,
    $$GarduOutboxesTableCreateCompanionBuilder,
    $$GarduOutboxesTableUpdateCompanionBuilder,
    (
      GarduOutbox,
      BaseReferences<_$AppDatabase, $GarduOutboxesTable, GarduOutbox>
    ),
    GarduOutbox,
    PrefetchHooks Function()> {
  $$GarduOutboxesTableTableManager(_$AppDatabase db, $GarduOutboxesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$GarduOutboxesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$GarduOutboxesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$GarduOutboxesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> gardu = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> perubahanJson = const Value.absent(),
            Value<String> diubahOleh = const Value.absent(),
            Value<String> diubahPada = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> percobaan = const Value.absent(),
            Value<String> pesanGagal = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              GarduOutboxesCompanion(
            gardu: gardu,
            ulp: ulp,
            perubahanJson: perubahanJson,
            diubahOleh: diubahOleh,
            diubahPada: diubahPada,
            status: status,
            percobaan: percobaan,
            pesanGagal: pesanGagal,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String gardu,
            Value<String> ulp = const Value.absent(),
            Value<String> perubahanJson = const Value.absent(),
            Value<String> diubahOleh = const Value.absent(),
            Value<String> diubahPada = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> percobaan = const Value.absent(),
            Value<String> pesanGagal = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              GarduOutboxesCompanion.insert(
            gardu: gardu,
            ulp: ulp,
            perubahanJson: perubahanJson,
            diubahOleh: diubahOleh,
            diubahPada: diubahPada,
            status: status,
            percobaan: percobaan,
            pesanGagal: pesanGagal,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$GarduOutboxesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $GarduOutboxesTable,
    GarduOutbox,
    $$GarduOutboxesTableFilterComposer,
    $$GarduOutboxesTableOrderingComposer,
    $$GarduOutboxesTableAnnotationComposer,
    $$GarduOutboxesTableCreateCompanionBuilder,
    $$GarduOutboxesTableUpdateCompanionBuilder,
    (
      GarduOutbox,
      BaseReferences<_$AppDatabase, $GarduOutboxesTable, GarduOutbox>
    ),
    GarduOutbox,
    PrefetchHooks Function()>;
typedef $$InsGarduHeadersTableCreateCompanionBuilder = InsGarduHeadersCompanion
    Function({
  required String localId,
  Value<String> kodeHeader,
  Value<String> ulp,
  Value<String> hari,
  required String tanggal,
  required String koordinatAwal,
  required String koordinatAkhir,
  Value<String> kmAwal,
  Value<String> kmAkhir,
  Value<String> kendala,
  Value<String> inputBy,
  required String dibuatPada,
  Value<String> status,
  Value<String> pesanGagal,
  Value<int> rowid,
});
typedef $$InsGarduHeadersTableUpdateCompanionBuilder = InsGarduHeadersCompanion
    Function({
  Value<String> localId,
  Value<String> kodeHeader,
  Value<String> ulp,
  Value<String> hari,
  Value<String> tanggal,
  Value<String> koordinatAwal,
  Value<String> koordinatAkhir,
  Value<String> kmAwal,
  Value<String> kmAkhir,
  Value<String> kendala,
  Value<String> inputBy,
  Value<String> dibuatPada,
  Value<String> status,
  Value<String> pesanGagal,
  Value<int> rowid,
});

class $$InsGarduHeadersTableFilterComposer
    extends Composer<_$AppDatabase, $InsGarduHeadersTable> {
  $$InsGarduHeadersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get hari => $composableBuilder(
      column: $table.hari, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kmAwal => $composableBuilder(
      column: $table.kmAwal, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kmAkhir => $composableBuilder(
      column: $table.kmAkhir, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kendala => $composableBuilder(
      column: $table.kendala, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get inputBy => $composableBuilder(
      column: $table.inputBy, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get dibuatPada => $composableBuilder(
      column: $table.dibuatPada, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => ColumnFilters(column));
}

class $$InsGarduHeadersTableOrderingComposer
    extends Composer<_$AppDatabase, $InsGarduHeadersTable> {
  $$InsGarduHeadersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ulp => $composableBuilder(
      column: $table.ulp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get hari => $composableBuilder(
      column: $table.hari, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tanggal => $composableBuilder(
      column: $table.tanggal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kmAwal => $composableBuilder(
      column: $table.kmAwal, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kmAkhir => $composableBuilder(
      column: $table.kmAkhir, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kendala => $composableBuilder(
      column: $table.kendala, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get inputBy => $composableBuilder(
      column: $table.inputBy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get dibuatPada => $composableBuilder(
      column: $table.dibuatPada, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => ColumnOrderings(column));
}

class $$InsGarduHeadersTableAnnotationComposer
    extends Composer<_$AppDatabase, $InsGarduHeadersTable> {
  $$InsGarduHeadersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localId =>
      $composableBuilder(column: $table.localId, builder: (column) => column);

  GeneratedColumn<String> get kodeHeader => $composableBuilder(
      column: $table.kodeHeader, builder: (column) => column);

  GeneratedColumn<String> get ulp =>
      $composableBuilder(column: $table.ulp, builder: (column) => column);

  GeneratedColumn<String> get hari =>
      $composableBuilder(column: $table.hari, builder: (column) => column);

  GeneratedColumn<String> get tanggal =>
      $composableBuilder(column: $table.tanggal, builder: (column) => column);

  GeneratedColumn<String> get koordinatAwal => $composableBuilder(
      column: $table.koordinatAwal, builder: (column) => column);

  GeneratedColumn<String> get koordinatAkhir => $composableBuilder(
      column: $table.koordinatAkhir, builder: (column) => column);

  GeneratedColumn<String> get kmAwal =>
      $composableBuilder(column: $table.kmAwal, builder: (column) => column);

  GeneratedColumn<String> get kmAkhir =>
      $composableBuilder(column: $table.kmAkhir, builder: (column) => column);

  GeneratedColumn<String> get kendala =>
      $composableBuilder(column: $table.kendala, builder: (column) => column);

  GeneratedColumn<String> get inputBy =>
      $composableBuilder(column: $table.inputBy, builder: (column) => column);

  GeneratedColumn<String> get dibuatPada => $composableBuilder(
      column: $table.dibuatPada, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get pesanGagal => $composableBuilder(
      column: $table.pesanGagal, builder: (column) => column);
}

class $$InsGarduHeadersTableTableManager extends RootTableManager<
    _$AppDatabase,
    $InsGarduHeadersTable,
    InsGarduHeader,
    $$InsGarduHeadersTableFilterComposer,
    $$InsGarduHeadersTableOrderingComposer,
    $$InsGarduHeadersTableAnnotationComposer,
    $$InsGarduHeadersTableCreateCompanionBuilder,
    $$InsGarduHeadersTableUpdateCompanionBuilder,
    (
      InsGarduHeader,
      BaseReferences<_$AppDatabase, $InsGarduHeadersTable, InsGarduHeader>
    ),
    InsGarduHeader,
    PrefetchHooks Function()> {
  $$InsGarduHeadersTableTableManager(
      _$AppDatabase db, $InsGarduHeadersTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$InsGarduHeadersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$InsGarduHeadersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$InsGarduHeadersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> localId = const Value.absent(),
            Value<String> kodeHeader = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> hari = const Value.absent(),
            Value<String> tanggal = const Value.absent(),
            Value<String> koordinatAwal = const Value.absent(),
            Value<String> koordinatAkhir = const Value.absent(),
            Value<String> kmAwal = const Value.absent(),
            Value<String> kmAkhir = const Value.absent(),
            Value<String> kendala = const Value.absent(),
            Value<String> inputBy = const Value.absent(),
            Value<String> dibuatPada = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String> pesanGagal = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              InsGarduHeadersCompanion(
            localId: localId,
            kodeHeader: kodeHeader,
            ulp: ulp,
            hari: hari,
            tanggal: tanggal,
            koordinatAwal: koordinatAwal,
            koordinatAkhir: koordinatAkhir,
            kmAwal: kmAwal,
            kmAkhir: kmAkhir,
            kendala: kendala,
            inputBy: inputBy,
            dibuatPada: dibuatPada,
            status: status,
            pesanGagal: pesanGagal,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String localId,
            Value<String> kodeHeader = const Value.absent(),
            Value<String> ulp = const Value.absent(),
            Value<String> hari = const Value.absent(),
            required String tanggal,
            required String koordinatAwal,
            required String koordinatAkhir,
            Value<String> kmAwal = const Value.absent(),
            Value<String> kmAkhir = const Value.absent(),
            Value<String> kendala = const Value.absent(),
            Value<String> inputBy = const Value.absent(),
            required String dibuatPada,
            Value<String> status = const Value.absent(),
            Value<String> pesanGagal = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              InsGarduHeadersCompanion.insert(
            localId: localId,
            kodeHeader: kodeHeader,
            ulp: ulp,
            hari: hari,
            tanggal: tanggal,
            koordinatAwal: koordinatAwal,
            koordinatAkhir: koordinatAkhir,
            kmAwal: kmAwal,
            kmAkhir: kmAkhir,
            kendala: kendala,
            inputBy: inputBy,
            dibuatPada: dibuatPada,
            status: status,
            pesanGagal: pesanGagal,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$InsGarduHeadersTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $InsGarduHeadersTable,
    InsGarduHeader,
    $$InsGarduHeadersTableFilterComposer,
    $$InsGarduHeadersTableOrderingComposer,
    $$InsGarduHeadersTableAnnotationComposer,
    $$InsGarduHeadersTableCreateCompanionBuilder,
    $$InsGarduHeadersTableUpdateCompanionBuilder,
    (
      InsGarduHeader,
      BaseReferences<_$AppDatabase, $InsGarduHeadersTable, InsGarduHeader>
    ),
    InsGarduHeader,
    PrefetchHooks Function()>;
typedef $$InsGarduRealisasisTableCreateCompanionBuilder
    = InsGarduRealisasisCompanion Function({
  required String localId,
  required String localHeaderId,
  Value<String> kodePekerjaanGardu,
  required String nomorGardu,
  Value<String> tier,
  required String snapshotJson,
  Value<String> status,
  Value<int> rowid,
});
typedef $$InsGarduRealisasisTableUpdateCompanionBuilder
    = InsGarduRealisasisCompanion Function({
  Value<String> localId,
  Value<String> localHeaderId,
  Value<String> kodePekerjaanGardu,
  Value<String> nomorGardu,
  Value<String> tier,
  Value<String> snapshotJson,
  Value<String> status,
  Value<int> rowid,
});

class $$InsGarduRealisasisTableFilterComposer
    extends Composer<_$AppDatabase, $InsGarduRealisasisTable> {
  $$InsGarduRealisasisTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get localHeaderId => $composableBuilder(
      column: $table.localHeaderId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kodePekerjaanGardu => $composableBuilder(
      column: $table.kodePekerjaanGardu,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get nomorGardu => $composableBuilder(
      column: $table.nomorGardu, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tier => $composableBuilder(
      column: $table.tier, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get snapshotJson => $composableBuilder(
      column: $table.snapshotJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));
}

class $$InsGarduRealisasisTableOrderingComposer
    extends Composer<_$AppDatabase, $InsGarduRealisasisTable> {
  $$InsGarduRealisasisTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get localHeaderId => $composableBuilder(
      column: $table.localHeaderId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kodePekerjaanGardu => $composableBuilder(
      column: $table.kodePekerjaanGardu,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get nomorGardu => $composableBuilder(
      column: $table.nomorGardu, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tier => $composableBuilder(
      column: $table.tier, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get snapshotJson => $composableBuilder(
      column: $table.snapshotJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));
}

class $$InsGarduRealisasisTableAnnotationComposer
    extends Composer<_$AppDatabase, $InsGarduRealisasisTable> {
  $$InsGarduRealisasisTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localId =>
      $composableBuilder(column: $table.localId, builder: (column) => column);

  GeneratedColumn<String> get localHeaderId => $composableBuilder(
      column: $table.localHeaderId, builder: (column) => column);

  GeneratedColumn<String> get kodePekerjaanGardu => $composableBuilder(
      column: $table.kodePekerjaanGardu, builder: (column) => column);

  GeneratedColumn<String> get nomorGardu => $composableBuilder(
      column: $table.nomorGardu, builder: (column) => column);

  GeneratedColumn<String> get tier =>
      $composableBuilder(column: $table.tier, builder: (column) => column);

  GeneratedColumn<String> get snapshotJson => $composableBuilder(
      column: $table.snapshotJson, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);
}

class $$InsGarduRealisasisTableTableManager extends RootTableManager<
    _$AppDatabase,
    $InsGarduRealisasisTable,
    InsGarduRealisasi,
    $$InsGarduRealisasisTableFilterComposer,
    $$InsGarduRealisasisTableOrderingComposer,
    $$InsGarduRealisasisTableAnnotationComposer,
    $$InsGarduRealisasisTableCreateCompanionBuilder,
    $$InsGarduRealisasisTableUpdateCompanionBuilder,
    (
      InsGarduRealisasi,
      BaseReferences<_$AppDatabase, $InsGarduRealisasisTable, InsGarduRealisasi>
    ),
    InsGarduRealisasi,
    PrefetchHooks Function()> {
  $$InsGarduRealisasisTableTableManager(
      _$AppDatabase db, $InsGarduRealisasisTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$InsGarduRealisasisTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$InsGarduRealisasisTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$InsGarduRealisasisTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> localId = const Value.absent(),
            Value<String> localHeaderId = const Value.absent(),
            Value<String> kodePekerjaanGardu = const Value.absent(),
            Value<String> nomorGardu = const Value.absent(),
            Value<String> tier = const Value.absent(),
            Value<String> snapshotJson = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              InsGarduRealisasisCompanion(
            localId: localId,
            localHeaderId: localHeaderId,
            kodePekerjaanGardu: kodePekerjaanGardu,
            nomorGardu: nomorGardu,
            tier: tier,
            snapshotJson: snapshotJson,
            status: status,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String localId,
            required String localHeaderId,
            Value<String> kodePekerjaanGardu = const Value.absent(),
            required String nomorGardu,
            Value<String> tier = const Value.absent(),
            required String snapshotJson,
            Value<String> status = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              InsGarduRealisasisCompanion.insert(
            localId: localId,
            localHeaderId: localHeaderId,
            kodePekerjaanGardu: kodePekerjaanGardu,
            nomorGardu: nomorGardu,
            tier: tier,
            snapshotJson: snapshotJson,
            status: status,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$InsGarduRealisasisTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $InsGarduRealisasisTable,
    InsGarduRealisasi,
    $$InsGarduRealisasisTableFilterComposer,
    $$InsGarduRealisasisTableOrderingComposer,
    $$InsGarduRealisasisTableAnnotationComposer,
    $$InsGarduRealisasisTableCreateCompanionBuilder,
    $$InsGarduRealisasisTableUpdateCompanionBuilder,
    (
      InsGarduRealisasi,
      BaseReferences<_$AppDatabase, $InsGarduRealisasisTable, InsGarduRealisasi>
    ),
    InsGarduRealisasi,
    PrefetchHooks Function()>;
typedef $$InsGarduTemuansTableCreateCompanionBuilder = InsGarduTemuansCompanion
    Function({
  required String localId,
  required String localRealisasiId,
  Value<String> kodeTemuan,
  required String tier,
  required String temuan,
  Value<String> deskripsi,
  Value<String> fotoTemuanPath,
  Value<String> fotoGarduPath,
  Value<String> status,
  Value<int> rowid,
});
typedef $$InsGarduTemuansTableUpdateCompanionBuilder = InsGarduTemuansCompanion
    Function({
  Value<String> localId,
  Value<String> localRealisasiId,
  Value<String> kodeTemuan,
  Value<String> tier,
  Value<String> temuan,
  Value<String> deskripsi,
  Value<String> fotoTemuanPath,
  Value<String> fotoGarduPath,
  Value<String> status,
  Value<int> rowid,
});

class $$InsGarduTemuansTableFilterComposer
    extends Composer<_$AppDatabase, $InsGarduTemuansTable> {
  $$InsGarduTemuansTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get localRealisasiId => $composableBuilder(
      column: $table.localRealisasiId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get kodeTemuan => $composableBuilder(
      column: $table.kodeTemuan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tier => $composableBuilder(
      column: $table.tier, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get temuan => $composableBuilder(
      column: $table.temuan, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deskripsi => $composableBuilder(
      column: $table.deskripsi, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get fotoTemuanPath => $composableBuilder(
      column: $table.fotoTemuanPath,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get fotoGarduPath => $composableBuilder(
      column: $table.fotoGarduPath, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));
}

class $$InsGarduTemuansTableOrderingComposer
    extends Composer<_$AppDatabase, $InsGarduTemuansTable> {
  $$InsGarduTemuansTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localId => $composableBuilder(
      column: $table.localId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get localRealisasiId => $composableBuilder(
      column: $table.localRealisasiId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get kodeTemuan => $composableBuilder(
      column: $table.kodeTemuan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tier => $composableBuilder(
      column: $table.tier, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get temuan => $composableBuilder(
      column: $table.temuan, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deskripsi => $composableBuilder(
      column: $table.deskripsi, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get fotoTemuanPath => $composableBuilder(
      column: $table.fotoTemuanPath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get fotoGarduPath => $composableBuilder(
      column: $table.fotoGarduPath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));
}

class $$InsGarduTemuansTableAnnotationComposer
    extends Composer<_$AppDatabase, $InsGarduTemuansTable> {
  $$InsGarduTemuansTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localId =>
      $composableBuilder(column: $table.localId, builder: (column) => column);

  GeneratedColumn<String> get localRealisasiId => $composableBuilder(
      column: $table.localRealisasiId, builder: (column) => column);

  GeneratedColumn<String> get kodeTemuan => $composableBuilder(
      column: $table.kodeTemuan, builder: (column) => column);

  GeneratedColumn<String> get tier =>
      $composableBuilder(column: $table.tier, builder: (column) => column);

  GeneratedColumn<String> get temuan =>
      $composableBuilder(column: $table.temuan, builder: (column) => column);

  GeneratedColumn<String> get deskripsi =>
      $composableBuilder(column: $table.deskripsi, builder: (column) => column);

  GeneratedColumn<String> get fotoTemuanPath => $composableBuilder(
      column: $table.fotoTemuanPath, builder: (column) => column);

  GeneratedColumn<String> get fotoGarduPath => $composableBuilder(
      column: $table.fotoGarduPath, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);
}

class $$InsGarduTemuansTableTableManager extends RootTableManager<
    _$AppDatabase,
    $InsGarduTemuansTable,
    InsGarduTemuan,
    $$InsGarduTemuansTableFilterComposer,
    $$InsGarduTemuansTableOrderingComposer,
    $$InsGarduTemuansTableAnnotationComposer,
    $$InsGarduTemuansTableCreateCompanionBuilder,
    $$InsGarduTemuansTableUpdateCompanionBuilder,
    (
      InsGarduTemuan,
      BaseReferences<_$AppDatabase, $InsGarduTemuansTable, InsGarduTemuan>
    ),
    InsGarduTemuan,
    PrefetchHooks Function()> {
  $$InsGarduTemuansTableTableManager(
      _$AppDatabase db, $InsGarduTemuansTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$InsGarduTemuansTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$InsGarduTemuansTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$InsGarduTemuansTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> localId = const Value.absent(),
            Value<String> localRealisasiId = const Value.absent(),
            Value<String> kodeTemuan = const Value.absent(),
            Value<String> tier = const Value.absent(),
            Value<String> temuan = const Value.absent(),
            Value<String> deskripsi = const Value.absent(),
            Value<String> fotoTemuanPath = const Value.absent(),
            Value<String> fotoGarduPath = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              InsGarduTemuansCompanion(
            localId: localId,
            localRealisasiId: localRealisasiId,
            kodeTemuan: kodeTemuan,
            tier: tier,
            temuan: temuan,
            deskripsi: deskripsi,
            fotoTemuanPath: fotoTemuanPath,
            fotoGarduPath: fotoGarduPath,
            status: status,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String localId,
            required String localRealisasiId,
            Value<String> kodeTemuan = const Value.absent(),
            required String tier,
            required String temuan,
            Value<String> deskripsi = const Value.absent(),
            Value<String> fotoTemuanPath = const Value.absent(),
            Value<String> fotoGarduPath = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              InsGarduTemuansCompanion.insert(
            localId: localId,
            localRealisasiId: localRealisasiId,
            kodeTemuan: kodeTemuan,
            tier: tier,
            temuan: temuan,
            deskripsi: deskripsi,
            fotoTemuanPath: fotoTemuanPath,
            fotoGarduPath: fotoGarduPath,
            status: status,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$InsGarduTemuansTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $InsGarduTemuansTable,
    InsGarduTemuan,
    $$InsGarduTemuansTableFilterComposer,
    $$InsGarduTemuansTableOrderingComposer,
    $$InsGarduTemuansTableAnnotationComposer,
    $$InsGarduTemuansTableCreateCompanionBuilder,
    $$InsGarduTemuansTableUpdateCompanionBuilder,
    (
      InsGarduTemuan,
      BaseReferences<_$AppDatabase, $InsGarduTemuansTable, InsGarduTemuan>
    ),
    InsGarduTemuan,
    PrefetchHooks Function()>;
typedef $$ListTemuansTableCreateCompanionBuilder = ListTemuansCompanion
    Function({
  Value<int?> no,
  required String tier,
  required String objekInspeksi,
  required String temuan,
  Value<int> rowid,
});
typedef $$ListTemuansTableUpdateCompanionBuilder = ListTemuansCompanion
    Function({
  Value<int?> no,
  Value<String> tier,
  Value<String> objekInspeksi,
  Value<String> temuan,
  Value<int> rowid,
});

class $$ListTemuansTableFilterComposer
    extends Composer<_$AppDatabase, $ListTemuansTable> {
  $$ListTemuansTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tier => $composableBuilder(
      column: $table.tier, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get objekInspeksi => $composableBuilder(
      column: $table.objekInspeksi, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get temuan => $composableBuilder(
      column: $table.temuan, builder: (column) => ColumnFilters(column));
}

class $$ListTemuansTableOrderingComposer
    extends Composer<_$AppDatabase, $ListTemuansTable> {
  $$ListTemuansTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get no => $composableBuilder(
      column: $table.no, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tier => $composableBuilder(
      column: $table.tier, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get objekInspeksi => $composableBuilder(
      column: $table.objekInspeksi,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get temuan => $composableBuilder(
      column: $table.temuan, builder: (column) => ColumnOrderings(column));
}

class $$ListTemuansTableAnnotationComposer
    extends Composer<_$AppDatabase, $ListTemuansTable> {
  $$ListTemuansTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get no =>
      $composableBuilder(column: $table.no, builder: (column) => column);

  GeneratedColumn<String> get tier =>
      $composableBuilder(column: $table.tier, builder: (column) => column);

  GeneratedColumn<String> get objekInspeksi => $composableBuilder(
      column: $table.objekInspeksi, builder: (column) => column);

  GeneratedColumn<String> get temuan =>
      $composableBuilder(column: $table.temuan, builder: (column) => column);
}

class $$ListTemuansTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ListTemuansTable,
    ListTemuan,
    $$ListTemuansTableFilterComposer,
    $$ListTemuansTableOrderingComposer,
    $$ListTemuansTableAnnotationComposer,
    $$ListTemuansTableCreateCompanionBuilder,
    $$ListTemuansTableUpdateCompanionBuilder,
    (ListTemuan, BaseReferences<_$AppDatabase, $ListTemuansTable, ListTemuan>),
    ListTemuan,
    PrefetchHooks Function()> {
  $$ListTemuansTableTableManager(_$AppDatabase db, $ListTemuansTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ListTemuansTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ListTemuansTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ListTemuansTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            Value<String> tier = const Value.absent(),
            Value<String> objekInspeksi = const Value.absent(),
            Value<String> temuan = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ListTemuansCompanion(
            no: no,
            tier: tier,
            objekInspeksi: objekInspeksi,
            temuan: temuan,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            Value<int?> no = const Value.absent(),
            required String tier,
            required String objekInspeksi,
            required String temuan,
            Value<int> rowid = const Value.absent(),
          }) =>
              ListTemuansCompanion.insert(
            no: no,
            tier: tier,
            objekInspeksi: objekInspeksi,
            temuan: temuan,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$ListTemuansTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ListTemuansTable,
    ListTemuan,
    $$ListTemuansTableFilterComposer,
    $$ListTemuansTableOrderingComposer,
    $$ListTemuansTableAnnotationComposer,
    $$ListTemuansTableCreateCompanionBuilder,
    $$ListTemuansTableUpdateCompanionBuilder,
    (ListTemuan, BaseReferences<_$AppDatabase, $ListTemuansTable, ListTemuan>),
    ListTemuan,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$GlobalHeadersTableTableManager get globalHeaders =>
      $$GlobalHeadersTableTableManager(_db, _db.globalHeaders);
  $$MasterPenyulangsTableTableManager get masterPenyulangs =>
      $$MasterPenyulangsTableTableManager(_db, _db.masterPenyulangs);
  $$LaporanHariansTableTableManager get laporanHarians =>
      $$LaporanHariansTableTableManager(_db, _db.laporanHarians);
  $$SyncInfosTableTableManager get syncInfos =>
      $$SyncInfosTableTableManager(_db, _db.syncInfos);
  $$P0LokalsTableTableManager get p0Lokals =>
      $$P0LokalsTableTableManager(_db, _db.p0Lokals);
  $$P0OutboxesTableTableManager get p0Outboxes =>
      $$P0OutboxesTableTableManager(_db, _db.p0Outboxes);
  $$MasterGardusTableTableManager get masterGardus =>
      $$MasterGardusTableTableManager(_db, _db.masterGardus);
  $$GarduOutboxesTableTableManager get garduOutboxes =>
      $$GarduOutboxesTableTableManager(_db, _db.garduOutboxes);
  $$InsGarduHeadersTableTableManager get insGarduHeaders =>
      $$InsGarduHeadersTableTableManager(_db, _db.insGarduHeaders);
  $$InsGarduRealisasisTableTableManager get insGarduRealisasis =>
      $$InsGarduRealisasisTableTableManager(_db, _db.insGarduRealisasis);
  $$InsGarduTemuansTableTableManager get insGarduTemuans =>
      $$InsGarduTemuansTableTableManager(_db, _db.insGarduTemuans);
  $$ListTemuansTableTableManager get listTemuans =>
      $$ListTemuansTableTableManager(_db, _db.listTemuans);
}
