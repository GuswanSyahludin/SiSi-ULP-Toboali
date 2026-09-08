from pathlib import Path
p=Path('SiSi_Mobile/lib/screens/dashboard_screen.dart')
s=p.read_text()
field="  Timer? _onlineTimer;\n"
if s.count(field)!=1: raise SystemExit('timer field anchor changed')
s=s.replace(field,field+"  final ValueNotifier<int> _settingsRefresh = ValueNotifier<int>(0);\n",1)
dispose="    _onlineTimer?.cancel();\n    _bubbleController.dispose();"
if s.count(dispose)!=1: raise SystemExit('dispose anchor changed')
s=s.replace(dispose,"    _onlineTimer?.cancel();\n    _settingsRefresh.dispose();\n    _bubbleController.dispose();",1)
old="""      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
"""
new="""      body: RefreshIndicator(
        onRefresh: () async {
          _settingsRefresh.value++;
          await Future<void>.delayed(const Duration(milliseconds: 350));
          if (mounted) setState(() {});
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
"""
# Last ListView occurrence belongs to settings, replace from settings method only.
start=s.index('  Widget _buildMenuPengaturan()')
pos=s.find(old,start)
if pos<0: raise SystemExit('settings list anchor changed')
s=s[:pos]+s[pos:].replace(old,new,1)
old_child="          SyncSectionPengaturan(sesi: widget.sesi),"
new_child="          SyncSectionPengaturan(sesi: widget.sesi, refreshListenable: _settingsRefresh),"
if s.count(old_child)!=1: raise SystemExit('sync child anchor changed')
s=s.replace(old_child,new_child,1)
# Close RefreshIndicator after ListView.
anchor="""          ),
        ],
      ),
    );
  }

  Future<void> _handleLogout() async {
"""
replacement="""          ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleLogout() async {
"""
if s.count(anchor)!=1: raise SystemExit('settings close anchor changed')
s=s.replace(anchor,replacement,1)
p.write_text(s)
